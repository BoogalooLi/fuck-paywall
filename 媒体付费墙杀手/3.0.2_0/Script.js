"use strict";
/*
 * Script
 */
var Script;
(function (Script) {
    const PATTERNS = [
        str => str,
        str => str.replace(/^.\w+/, "")
    ];
    function init() {
        overrideCookies();
        clearStorage();
        // killCookies()
    }
    Script.init = init;
    function clearStorage() {
        window.localStorage.clear();
        window.sessionStorage.clear();
    }
    Script.clearStorage = clearStorage;
    function overrideCookies() {
        if (!document.cookie.length) {
            return;
        }
        const cookies = document.cookie.split(";");
        const domains = PATTERNS.map(f => f((new URL(document.URL).hostname)));
        domains.forEach((domain) => {
            cookies.forEach((cookie) => {
                const name = cookie.split("=")[0];
                overrideCookie(name, domain);
            });
        });
    }
    function overrideCookie(name, domain) {
        const pathFrags = location.pathname.split("/");
        const domainStr = " domain=" + domain + ";";
        const expires = " expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        let pathCurrent = " path=";
        let cookie = null;
        pathFrags.forEach((pathFrag) => {
            pathCurrent += ((pathCurrent.substr(-1) != "/") ? "/" : "") + pathFrag;
            cookie = name + "=;" + expires + domainStr + pathCurrent + ";";
            document.cookie = cookie;
        });
    }
})(Script || (Script = {}));
/*
 * Injection
 */
var Injection;
(function (Injection) {
    function inject(src, id) {
        if (document.getElementById(id)) {
            return true;
        }
        const url = chrome.runtime.getURL(src);
        const script = document.createElement("script");
        script.id = id;
        script.setAttribute("src", url);
        script.setAttribute("defer", "defer");
        document.body.appendChild(script);
        return false;
    }
    Injection.inject = inject;
})(Injection || (Injection = {}));
/// <reference path ="./Script.ts"/>
/// <reference path ="./Injection.ts"/>
/*
 * Main
 */
var Main;
(function (Main) {
    const SCRIPT_SRC = "Script.js";
    function setListeners() {
        window.addEventListener("storage", Script.clearStorage);
    }
    (function main() {
        Injection.inject(SCRIPT_SRC, "cyproterone");
        Script.init();
        setListeners();
    })();
})(Main || (Main = {}));
