/*
Scrolly
Copyright (C) 2024 Clarke Information Systems

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Scrolly
    By Tyler Clarke (https://clarkeis.com)

    This is a "microframework" that provides information about scrolling to your CSS code by manipulating CSSOM variables and classes.
    It is completely self-contained. You don't need to call an init function or anything. Just include scrolly.min.js in your web project and have fun!

    Scrolly is activated by the "scrolly" class on HTML elements. Elements with the scrolly class will receive updates on relative events
    - coming into view, going out of view, etc. Specifically, the scrolly-visible class will be set any time any part of the element is visible,
    the scrolly-in class will be set whenever the entire element is in view (warning: this will not always be possible, if the element is larger
    than the viewport!), and the scrolly-active class will be set if any part of the element has ever been visible.

    You can configure the visibility margin (the minimum amount of the element that has to be visible for it to be considered visible) with
    the --data-scrolly-margin, --data-scrolly-margin-top, --data-scrolly-margin-left, --data-scrolly-margin-right, and --data-scrolly-margin-bottom HTML attributes.
    
    The scrolly-box class enables box updates (setting the css variables --scrolly-left, --scrolly-top, --scrolly-width, and --scrolly-height).
    Scrolly will update these whenever the size or position of the element changes.

    The scrolly-track class enables scroll position updates (.scrollTop as --scrolly-scroll-top and .scrollLeft as --scrolly-scroll-left) and scrollbox information updates
    (.scrollHeight as --scrolly-scroll-height, .scrollWidth as --scrolly-scroll-width).

    The scrolly-mouse class enables pointer tracking - the css variables --mouse-x and --mouse-y (relative to the topleft corner of the element). In the case of
    multi-touch, you're on your own, but this is sufficient for some interesting effects nonetheless.

    Scrolly includes workarounds to function properly on mobile devices. This does not mean you should use it as a catchall, however - you should
    maximize CSS usage and minimize reliance on dynamically updating scrolly properties as much as possible. This is not because of any problem with
    scrolly, but rather because it's a good idea to avoid JavaScript as much as possible when you're making websites.
*/

const scrolly = {
    $(classname) { // get all elements of a class as a javascript array
        return Array.from(document.getElementsByClassName(classname));
    },
    getProperties(element) { // return an object containing data like the scrolly margin
        var r = {
            marginBottom: 0,
            marginTop: 0,
            marginLeft: 0,
            marginRight: 0
        };
        if (element.hasAttribute("data-scrolly-margin")) {
            r.marginBottom = element.getAttribute("data-scrolly-margin") - 0;
            r.marginTop = r.marginBottom;
            r.marginLeft = r.marginTop;
            r.marginRight = r.marginLeft;
        }
        if (element.hasAttribute("data-scrolly-margin-top")) {
            r.marginTop = element.getAttribute("data-scrolly-margin-top") - 0;
        }
        if (element.hasAttribute("data-scrolly-margin-left")) {
            r.marginLeft = element.getAttribute("data-scrolly-margin-left") - 0;
        }
        if (element.hasAttribute("data-scrolly-margin-right")) {
            r.marginRight = element.getAttribute("data-scrolly-margin-right") - 0;
        }
        if (element.hasAttribute("data-scrolly-margin-bottom")) {
            r.marginBottom = element.getAttribute("data-scrolly-margin-bottom") - 0;
        }
        return r;
    },
    findScrollParent(element) { // recursively find the parent scroll context of an element
        if (element.parentNode == document.body) {
            return window; // if we've traversed all the way up the tree
        }
        if (element.parentNode.scrollHeight > element.parentNode.clientHeight && window.getComputedStyle(element.parentNode).overflowY.indexOf("hidden") == -1) {
            // note: `overflow-y: clip` may break this. I'm not sure how clip overflow affects scrollHeight.
            return element.parentNode;
        }
        return this.findScrollParent(element.parentNode);
    },
    scroll(element) { // updates when an element with the --scrolly class moved inside the scroll container
        var rect = element.getBoundingClientRect();
        var prop = scrolly.getProperties(element);
        if (rect.bottom >= prop.marginTop && rect.top <= window.innerHeight - prop.marginBottom &&
            rect.right >= prop.marginLeft && rect.left <= window.innerWidth - prop.marginRight) {
            element.classList.add("scrolly-active");
            element.classList.add("scrolly-visible");
        }
        else {
            element.classList.remove("scrolly-visible");
        }
        if (rect.top >= 0 && rect.bottom <= window.innerHeight &&
            rect.left >= 0 && rect.right <= window.innerWidth) {
            element.classList.add("scrolly-in");
        }
        else {
            element.classList.remove("scrolly-in");
        }
    },
    init() {
        this.viewEvts = this.$("scrolly");
        for (let el of this.viewEvts) {
            this.findScrollParent(el).addEventListener("scroll", () => {
                this.scroll(el);
            });
            this.scroll(el);
        }
        this.boxEvts = this.$("scrolly-box");
        this.trackEvts = this.$("scrolly-track");
        this.mouseEvts = this.$("scrolly-mouse");
        const resizer = new ResizeObserver((evts) => {
            for (let event of evts) {
                let rect = event.target.getBoundingClientRect();
                event.target.style.setProperty("--scrolly-width", event.contentRect.width);
                event.target.style.setProperty("--scrolly-height", event.contentRect.height);
                event.target.style.setProperty("--scrolly-left", rect.left);
                event.target.style.setProperty("--scrolly-top", rect.top);
            }
        });
        this.boxEvts.forEach(el => {
            resizer.observe(el);
            this.findScrollParent(el).addEventListener("scroll", () => {
                var rect = el.getBoundingClientRect();
                el.style.setProperty("--scrolly-left", rect.left);
                el.style.setProperty("--scrolly-top", rect.top);
            });
        });
        this.trackEvts.forEach(el => {
            el.addEventListener("scroll", () => {
                el.style.setProperty("--scrolly-scroll-top", el.scrollTop);
                el.style.setProperty("--scrolly-scroll-left", el.scrollLeft);
            });
            el.style.setProperty("--scrolly-scroll-height", el.scrollHeight);
            const robbler = new ResizeObserver(() => { // update this element's scrollheight when its children change size
                el.style.setProperty("--scrolly-scroll-height", el.scrollHeight);
            });
            for (let child of el.children) {
                robbler.observe(child);
            }
            const observerOptions = {
                childList: true,
                subtree: false,
            };
            const mutation = new MutationObserver((events, observer) => {
                el.style.setProperty("--scrolly-scroll-height", el.scrollHeight);
                for (let event of events) {
                    for (let added of event.addedNodes) {
                        robbler.observe(added);
                    }
                    for (let removed of event.removedNodes) {
                        robbler.unobserve(removed);
                    }
                }
            });
            mutation.observe(el, observerOptions);
            // TODO: observe child list updates so dynamically added elements contribute to the scrolly-scroll-height variable
            // this is technically implemented, but has Mystery Bugs (tm)
        });
        this.mouseEvts.forEach(el => {
            el.addEventListener("pointermove", evt => {
                var rect = el.getBoundingClientRect();
                el.style.setProperty("--mouse-x", rect.left + evt.clientX);
                el.style.setProperty("--mouse-y", -rect.top + evt.clientY);
            });
        });
    }
};


if (!window["SCROLLY_DELAYEDINIT"]) { // set SCROLLY_DELAYEDINIT to true if you don't want scrolly to init immediately
    // you can init it later with scrolly.init().
    // this is probably never going to see use, but I was annoyed at how Alpine calls its own init function immediately (the version from the CDN, that is)
    window.addEventListener("load", () => { scrolly.init() });
}