"use strict";
/*
 * Fences
 */
/*
 * Localization
 */
var Localization;
(function (Localization) {
    function get(src) {
        return chrome.i18n.getMessage(src);
    }
    Localization.get = get;
})(Localization || (Localization = {}));
/*
 * Messages
 */
/*
 * Utils
 */
var Utils;
(function (Utils) {
    function flatMap(array) {
        return array.reduce((acc, curr) => {
            return acc.concat(curr);
        }, []);
    }
    Utils.flatMap = flatMap;
    function uniqueFilter(array, equator) {
        return array.filter((element, pos) => {
            return pos === array.findIndex((curr) => equator(curr, element));
        });
    }
    Utils.uniqueFilter = uniqueFilter;
    function getDomain(url) {
        return new URL(url).hostname;
    }
    Utils.getDomain = getDomain;
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    Utils.getRandomInt = getRandomInt;
    function NLForEach(nodeList, f) {
        for (let i = 0; i < nodeList.length; i++) {
            f(nodeList[i]);
        }
    }
    Utils.NLForEach = NLForEach;
    function NLFind(nodeList, f) {
        for (let i = 0; i < nodeList.length; i++) {
            if (f(nodeList[i])) {
                return nodeList[i];
            }
        }
        return undefined;
    }
    Utils.NLFind = NLFind;
})(Utils || (Utils = {}));
/*
 * XHRequest
 */
var XHR;
(function (XHR) {
    function get(url, responseType) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = responseType;
            xhr.onerror = err => reject(err);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status !== 200) {
                        reject(xhr.status);
                    }
                    else {
                        resolve(xhr.response);
                    }
                }
            };
            xhr.open("GET", url);
            xhr.send(null);
        });
    }
    XHR.get = get;
})(XHR || (XHR = {}));
/*
 * ContentSettings
 */
var ContentSettings;
(function (ContentSettings) {
    const COOKIE_SETTING_MAP = {
        ["regular" /* regular */]: "block",
        ["power" /* power */]: "block",
        // [Policy.experimental]: "session_only",
        ["experimental" /* experimental */]: null,
        ["none" /* none */]: null
    };
    const JS_SETTING_MAP = {
        ["regular" /* regular */]: null,
        ["power" /* power */]: "block",
        // [Policy.experimental]: "block",
        ["experimental" /* experimental */]: null,
        ["none" /* none */]: null
    };
    function isEnabled() {
        return chrome.contentSettings !== undefined;
    }
    ContentSettings.isEnabled = isEnabled;
    function set(fences) {
        if (!isEnabled()) {
            return Promise.resolve([]);
        }
        return clear().then(() => {
            return Promise.all(fences.map(setIndividual));
        });
    }
    ContentSettings.set = set;
    function clear() {
        return new Promise(resolve => {
            chrome.contentSettings.cookies.clear({}, () => {
                chrome.contentSettings.javascript.clear({}, resolve);
            });
        });
    }
    function setIndividual(fence) {
        const pattern = "*://" + fence.domain + "/*";
        const promises = [
            setCookies(pattern, fence.policy, COOKIE_SETTING_MAP),
            setJS(pattern, fence.policy, JS_SETTING_MAP)
        ];
        return Promise.all(promises);
    }
    function setCookies(pattern, policy, settingsMap) {
        let setting = settingsMap[policy];
        if (!setting) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            chrome.contentSettings.cookies.set({ primaryPattern: pattern, setting: setting }, resolve);
        });
    }
    function setJS(pattern, policy, settingsMap) {
        let setting = settingsMap[policy];
        if (!setting) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            chrome.contentSettings.javascript.set({ primaryPattern: pattern, setting: setting }, resolve);
        });
    }
})(ContentSettings || (ContentSettings = {}));
/*
 * Cookies
 */
var Cookies;
(function (Cookies) {
    const PATTERNS = [
        str => str,
        str => str.replace(/^.\w+/, "")
    ];
    function clear(domain) {
        return getAll(domain).then(remove);
    }
    Cookies.clear = clear;
    function onChange(changeInfo) {
        if (changeInfo.removed) {
            return;
        }
        switch (changeInfo.cause) {
            case "evicted":
            case "expired":
            case "expired_overwrite":
            case "overwrite":
                return;
        }
        if (changeInfo.cookie.session) {
            return;
        }
        Fences.find(changeInfo.cookie.domain).then((fence) => {
            if (fence.policy === "none" /* none */) {
                return;
            }
            remove([changeInfo.cookie]);
        });
    }
    Cookies.onChange = onChange;
    function getAll(domain) {
        const patterns = PATTERNS.map((f) => f(domain));
        const promises = patterns.map((pattern) => get(pattern));
        return Promise.all(promises).then(Utils.flatMap);
    }
    function get(domain) {
        return new Promise(resolve => chrome.cookies.getAll({ domain: domain }, resolve));
    }
    function remove(cookies) {
        cookies.forEach((cookie) => {
            chrome.cookies.remove({ name: cookie.name, url: getUrl(cookie) });
        });
    }
    function getUrl(cookie) {
        return "http" + (cookie.secure ? "s" : "") + ":\/\/" + cookie.domain + cookie.path;
    }
})(Cookies || (Cookies = {}));
/*
 * Fences
 */
var Fences;
(function (Fences) {
    const MIN_DOMAIN_LEN = 2;
    const BLOCK_LIST_SRC = "./DefaultBlockList.json";
    const FENCES = "fences";
    let cache = null;
    function get() {
        if (cache) {
            return Promise.resolve(cache);
        }
        return StorageArea.get(FENCES).then((fences) => {
            return (cache = Utils.uniqueFilter(fences, (a, b) => a.domain === b.domain));
        }).catch(() => {
            return XHR.get(BLOCK_LIST_SRC, "json" /* JSON */);
        }).then((fences) => {
            fences.forEach((fence) => Cookies.clear(fence.domain));
            return set(fences);
        });
    }
    Fences.get = get;
    function update(domain, policy) {
        const fence = { domain: domain, policy: policy };
        return get().then((fences) => {
            const index = fences.findIndex((curr) => curr.domain === domain);
            if (~index && policy === "none" /* none */) {
                fences.splice(index, 1);
            }
            else if (~index) {
                fences[index] = fence;
            }
            else {
                fences.push(fence);
            }
            return set(fences);
        });
    }
    Fences.update = update;
    function find(dirtyDomain) {
        return get().then((fences) => {
            const fence = findFence(dirtyDomain, fences);
            return fence ? fence : { domain: dirtyDomain, policy: "none" /* none */ };
        });
    }
    Fences.find = find;
    function set(fences) {
        return StorageArea.set({ [FENCES]: fences }).then(() => (cache = fences));
    }
    function findFence(dirtyDomain, fences) {
        return fences.find((curr) => {
            const domainFrags = curr.domain.split(".");
            const dirtyFrags = dirtyDomain.split(".");
            let minLength = Math.min(domainFrags.length, dirtyFrags.length);
            if (minLength <= MIN_DOMAIN_LEN) {
                minLength = MIN_DOMAIN_LEN + 1;
            }
            for (let i = 1; i < minLength; i++) {
                const f1 = domainFrags[domainFrags.length - i];
                const f2 = dirtyFrags[dirtyFrags.length - i];
                if (f1 !== f2) {
                    return false;
                }
            }
            return true;
        });
    }
})(Fences || (Fences = {}));
/*
 * Install
 */
var Install;
(function (Install) {
    function onInstalled(details) {
    }
    Install.onInstalled = onInstalled;
})(Install || (Install = {}));
/*
 * Messages
 */
var Messages;
(function (Messages) {
    function onMessage(message) {
        Tabs.getCurrentDomain().then((domain) => {
            if (message.query) {
                onQuery(domain);
            }
            else if (message.newPolicy) {
                onNewPolicy(domain, message.newPolicy);
            }
        }).catch(err => {
            console.error(err);
        });
    }
    Messages.onMessage = onMessage;
    function onQuery(domain) {
        Fences.find(domain).then((fence) => {
            const reply = { policy: fence.policy };
            chrome.runtime.sendMessage(reply);
        });
    }
    function onNewPolicy(domain, policy) {
        Fences.update(domain, policy).then((fences) => {
            return ContentSettings.set(fences);
        }).then(() => {
            if (policy === "none" /* none */) {
                return;
            }
            return Cookies.clear(domain);
        }).then(() => {
            Tabs.reload(domain);
        });
    }
})(Messages || (Messages = {}));
/*
 * StorageArea
 */
var StorageArea;
(function (StorageArea) {
    function get(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(key, (items) => {
                items && items[key] ? resolve(items[key]) : reject("No Items Found in Storage");
            });
        });
    }
    StorageArea.get = get;
    function set(items) {
        return new Promise(resolve => chrome.storage.sync.set(items, resolve));
    }
    StorageArea.set = set;
})(StorageArea || (StorageArea = {}));
/*
 * Tabs
 */
var Tabs;
(function (Tabs) {
    const SCRIPT_SRC = "./Script.js";
    function onUpdate(tabId, changeInfo) {
        if (changeInfo.status !== "loading") {
            return;
        }
        query({ currentWindow: true, active: true }).then((tabs) => {
            if (!tabs[0].url) {
                return { domain: null, policy: "none" /* none */ };
            }
            const domain = Utils.getDomain(tabs[0].url);
            UI.setBrowserActionStatus(tabId, tabs[0].url);
            return Fences.find(domain);
        }).then((fence) => {
            if (fence.policy !== "none" /* none */) {
                Cookies.clear(fence.domain).then();
                if (!ContentSettings.isEnabled()) {
                    inject(tabId, SCRIPT_SRC);
                }
            }
            UI.updateBrowserAction(tabId, fence.policy);
        }).catch(err => {
            console.error(err);
        });
    }
    Tabs.onUpdate = onUpdate;
    function getCurrentDomain() {
        return query({ currentWindow: true, active: true }).then((tabs) => {
            return Utils.getDomain(tabs[0].url);
        });
    }
    Tabs.getCurrentDomain = getCurrentDomain;
    function reload(domain) {
        getIds(domain).then(reloadIds);
    }
    Tabs.reload = reload;
    function query(query) {
        return new Promise(resolve => chrome.tabs.query(query, (tabs) => resolve(tabs)));
    }
    function getIds(domain) {
        const urlPattern = "*://" + domain + "/*";
        return query({ url: urlPattern }).then((tabs) => {
            return tabs.map((tab) => tab.id);
        });
    }
    function reloadIds(ids) {
        ids.forEach((tabId) => {
            chrome.tabs.reload(tabId, { bypassCache: true });
        });
    }
    function inject(id, src) {
        chrome.tabs.executeScript(id, { file: src });
    }
})(Tabs || (Tabs = {}));
/*
 * UI
 */
var UI;
(function (UI) {
    const ACTIVE_ICON = "./Assets/green_icon.png";
    const INACTIVE_ICON = "./Assets/brown_icon.png";
    function updateBrowserAction(tabId, policy) {
        let icon = null;
        const title = Localization.get(policy);
        if (policy !== "none" /* none */) {
            icon = ACTIVE_ICON;
        }
        else {
            icon = INACTIVE_ICON;
        }
        chrome.browserAction.setIcon({ tabId: tabId, path: icon });
        chrome.browserAction.setTitle({ tabId: tabId, title: title });
    }
    UI.updateBrowserAction = updateBrowserAction;
    function setBrowserActionStatus(tabId, url) {
        const isEnabled = url.startsWith("http");
        if (isEnabled) {
            chrome.browserAction.enable(tabId);
        }
        else {
            chrome.browserAction.disable(tabId);
        }
    }
    UI.setBrowserActionStatus = setBrowserActionStatus;
})(UI || (UI = {}));
/*
 * WebRequest
 */
var WebRequest;
(function (WebRequest) {
    WebRequest.FILTER = { urls: ["<all_urls>"] };
    WebRequest.BLOCKING_RESPONSE = ["blocking", "responseHeaders"];
    const MAIN_FRAME = "main_frame";
    const COOKIE_BLOCK_MAP = {
        ["regular" /* regular */]: true,
        ["power" /* power */]: true,
        ["experimental" /* experimental */]: false,
        ["none" /* none */]: false
    };
    const JS_BLOCK_MAP = {
        ["regular" /* regular */]: false,
        ["power" /* power */]: true,
        ["experimental" /* experimental */]: true,
        ["none" /* none */]: false
    };
    function onHeadersReceived(details) {
        const domain = getDomain(details);
        const response = { responseHeaders: details.responseHeaders };
        return Fences.find(domain).then((fence) => {
            if (COOKIE_BLOCK_MAP[fence.policy]) {
                blockCookies(details.responseHeaders);
            }
            if (details.type !== MAIN_FRAME) {
                return response;
            }
            if (JS_BLOCK_MAP[fence.policy]) {
                blockJS(details.responseHeaders);
            }
            return response;
        }).catch(err => {
            console.error(err);
            return response;
        });
    }
    WebRequest.onHeadersReceived = onHeadersReceived;
    function getDomain(details) {
        let url = details.type === MAIN_FRAME ? details.url : details["originUrl"];
        return Utils.getDomain(url);
    }
    function blockCookies(headers) {
        headers.forEach((header, index) => {
            if (header.name.toLowerCase() === "set-cookie") {
                headers.splice(index, 1);
            }
        });
    }
    function blockJS(headers) {
        const jsCSP = { name: "Content-Security-Policy", value: "script-src 'none';" };
        headers.push(jsCSP);
    }
})(WebRequest || (WebRequest = {}));
/// <reference path ="../Common/Fences.ts"/>
/// <reference path ="../Common/Localization.ts"/>
/// <reference path ="../Common/Messages.ts"/>
/// <reference path ="../Common/Utils.ts"/>
/// <reference path ="../Common/XHR.ts"/>
/// <reference path ="./ContentSettings.ts"/>
/// <reference path ="./Cookies.ts"/>
/// <reference path ="./Fences.ts"/>
/// <reference path ="./Install.ts"/>
/// <reference path ="./Messages.ts"/>
/// <reference path ="./StorageArea.ts"/>
/// <reference path ="./Tabs.ts"/>
/// <reference path ="./UI.ts"/>
/// <reference path ="./WebRequest.ts"/>
/*
 * Main
 */
var Main;
(function (Main) {
    function setListeners() {
        chrome.runtime.onInstalled.addListener(Install.onInstalled);
        chrome.runtime.onMessage.addListener(Messages.onMessage);
        chrome.tabs.onUpdated.addListener(Tabs.onUpdate);
        if (!ContentSettings.isEnabled()) {
            chrome.cookies.onChanged.addListener(Cookies.onChange);
            chrome.webRequest.onHeadersReceived.addListener(WebRequest.onHeadersReceived, WebRequest.FILTER, WebRequest.BLOCKING_RESPONSE);
        }
    }
    (function main() {
        setListeners();
    })();
})(Main || (Main = {}));
