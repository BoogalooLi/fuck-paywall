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
 * Messages
 */
var Messages;
(function (Messages) {
    function onMessage(message) {
        Popup.setRadio(message.policy);
    }
    Messages.onMessage = onMessage;
    function sendMessage(message) {
        chrome.runtime.sendMessage(message);
    }
    Messages.sendMessage = sendMessage;
})(Messages || (Messages = {}));
/*
 * Popup
 */
var Popup;
(function (Popup) {
    const LOCALIZATION_MAP_SRC = "../_locales/LocalizationMap.json";
    const GREETINGS_SRC_SRC = "../_locales/GreetingsSrc.json";
    let LOCALIZATION_MAP = null;
    let GREETINGS_SRC = null;
    function disableExperimental() {
        document.getElementById("stacked-radio-danger").setAttribute("style", "display: none");
    }
    Popup.disableExperimental = disableExperimental;
    function init() {
        const localizationPromise = XHR.get(LOCALIZATION_MAP_SRC, "json" /* JSON */);
        const greetingsPromise = XHR.get(GREETINGS_SRC_SRC, "json" /* JSON */);
        return Promise.all([localizationPromise, greetingsPromise]).then((e) => {
            LOCALIZATION_MAP = e[0];
            GREETINGS_SRC = e[1];
            setLocalization();
            setListeners();
        });
    }
    Popup.init = init;
    function setRadio(policy) {
        const radioId = LOCALIZATION_MAP[policy].radio;
        const radio = document.getElementById(radioId);
        radio.setAttribute("checked", "true");
    }
    Popup.setRadio = setRadio;
    function setLocalization() {
        const labels = document.getElementsByTagName("label");
        Object.keys(LOCALIZATION_MAP).forEach((key) => {
            const label = Utils.NLFind(labels, (label) => {
                return label.getAttribute("for") === LOCALIZATION_MAP[key].radio;
            });
            const labelSrc = LOCALIZATION_MAP[key].labelSrc;
            label.innerHTML = Localization.get(labelSrc);
        });
        setRandomGreeting();
    }
    function setListeners() {
        const radios = document.getElementsByTagName("input");
        const divs = document.getElementsByTagName("div");
        Utils.NLForEach(radios, (radio) => radio.addEventListener("click", onRadioSelect));
        Utils.NLForEach(divs, (div) => div.addEventListener("mouseenter", onMouseHover));
    }
    function onRadioSelect(event) {
        const radioId = event.target.id;
        const policy = getPolicy(radioId);
        Messages.sendMessage({ newPolicy: policy });
        window.close();
    }
    function onMouseHover(event) {
        const radioId = event.target.firstElementChild.id;
        const policy = getPolicy(radioId);
        if (!policy) {
            setRandomGreeting();
            return;
        }
        const descriptionSrc = LOCALIZATION_MAP[policy].descriptionSrc;
        const description = Localization.get(descriptionSrc);
        setComment(description);
    }
    function setRandomGreeting() {
        const randomGreetingSrc = GREETINGS_SRC[Utils.getRandomInt(0, GREETINGS_SRC.length - 1)];
        const randomGreeting = Localization.get(randomGreetingSrc);
        setComment(randomGreeting);
    }
    function setComment(comment) {
        const comments = document.getElementById("comments");
        comments.innerHTML = !comment ? "" : comment;
    }
    function getPolicy(radioId) {
        return Object.keys(LOCALIZATION_MAP).find((key) => {
            return LOCALIZATION_MAP[key].radio === radioId;
        });
    }
})(Popup || (Popup = {}));
/// <reference path ="../Common/Fences.ts"/>
/// <reference path ="../Common/Localization.ts"/>
/// <reference path ="../Common/Messages.ts"/>
/// <reference path ="../Common/Utils.ts"/>
/// <reference path ="../Common/XHR.ts"/>
/// <reference path ="./Messages.ts"/>
/// <reference path ="./Popup.ts"/>
/*
 * Main
 */
var Main;
(function (Main) {
    function setListeners() {
        chrome.runtime.onMessage.addListener(Messages.onMessage);
    }
    (function main() {
        document.addEventListener("DOMContentLoaded", () => {
            Popup.init().then(() => {
                setListeners();
                Messages.sendMessage({ query: true });
            });
            Popup.disableExperimental();
        });
    })();
})(Main || (Main = {}));
