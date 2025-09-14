/**
 * https://github.com/julioedi/dynamic_css v1.0.0
 */
(() => {
    /**
     * CustomCssSheet dynamically generates CSS classes based on naming conventions,
     * responsive breakpoints, pseudo-classes, and transform utilities.
     * 
     * Features:
     * - Dynamically creates <style> sheets for different breakpoints.
     * - Supports responsive classes (e.g., `sm:mt-2`, `xl:bg-red`).
     * - Adds utility classes for spacing, sizing, colors, transforms, flex, grid, shadows, etc.
     * - Observes the DOM for new elements or class changes to inject CSS rules automatically.
     */
    class CustomCssSheet {
        // Default scaling factor for spacing and size utilities
        scale = window.dynamiCssScale || 0.25;

        inited = false; // Prevents multiple initializations
        classNames = {}; // Maps utility class names to CSS rules
        classNamesList = new Set(); // All possible class names
        classNamesListAdded = new Set(); // Classes already added to stylesheet

        // Breakpoints (reversed so largest first)
        sizes = (window.sizes ?? [
            { code: "xxl", size: 1440 },
            { code: "xl", size: 1366 },
            { code: "lg", size: 1280 },
            { code: "md", size: 1080 },
            { code: "sm", size: 540 },
            { code: "xs", size: 360 },
        ]).reverse();

        /**
         * Colors can be provided externally through window.dynamicCssColors,
         * otherwise defaults to an empty list.
         * Example: ["--primary-50"]
         */
        colors = window?.dynamicCssColors ?? [];

        sheets = []; // Holds <style> elements for each breakpoint
        matches = null; // Regex for responsive class detection
        matchesCodes = []; // Array of breakpoint codes (e.g., ["sm", "md", "xl"])

        constructor() {
            // Create a <style> tag for each breakpoint and append it to <head>
            this.sheets = [null]
                .concat(this.sizes.map(item => item.size))
                .map(item => {
                    const $el = document.createElement("style");
                    if (item) {
                        $el.media = `all and (min-width:${item}px)`;
                    }
                    document.head.appendChild($el);
                    return $el;
                });

            // Base sheet: insert default rules
            const base = this.sheets[0];
            base.sheet?.insertRule('[class*="grid"]{display:grid}', 0);
            base.sheet?.insertRule('[class*="flex"]{display:flex}', 1);

            // Generate spacing variables (CSS custom properties)
            let spaces = [];
            for (let i = 0; i < 32; i++) {
                spaces.push(`--sp-${i}:${i * this.scale}rem`);
            }
            spaces = ":root{" + spaces.join(";") + "}";
            base.sheet?.insertRule(spaces, 2);

            // Setup responsive regex
            this.matchesCodes = this.sizes.map(item => item.code);
            const items = this.matchesCodes.join("|");
            this.matches = new RegExp(`^(${items})\:(.*?)$`);

            this.getTranformRegex();
            this.init();
        }

        /**
         * Escapes regex special characters in a class name
         */
        scapeChars(item) {
            return item.replace(/([\\{}:()*+?.,^$|#\[\]\/])/g, "\\$1");
        }

        // List of valid CSS transform functions
        tranformKeys = [
            "matrix", "matrix3d", "perspective", "rotate", "rotate3d",
            "rotateX", "rotateY", "rotateZ", "translate", "translate3d",
            "translateX", "translateY", "translateZ", "scale", "scale3d",
            "scaleX", "scaleY", "scaleZ", "skew", "skewX", "skewY"
        ];

        tranformRegex = /^$/;
        tranformRegexVariant = /^$/;
        tranformRegexChilds = /^$/;

        /**
         * Build regex patterns for transform utilities
         */
        getTranformRegex() {
            const keys = this.tranformKeys.join("|");
            this.tranformRegex = new RegExp(`^(${keys})(-[\\w|\.|%]+)$`, "i");
            this.tranformRegexChilds = new RegExp(`-(${keys})-([\\w|\.|%]+)+`, "ig");
            this.tranformRegexVariant = new RegExp(
                `^transform(-(${keys})(-[\\w|\.|%]+)+)+$`,
                "i"
            );
        }

        /**
         * Process transform-related class names and generate CSS rules
         */
        processTransform(item) {
            const name = this.scapeChars(item);

            // Match: transform with custom variable -> transform-(--my-var)
            const variant = item.match(/^transform-\((--[a-z0-9\-_]+)\)$/i);
            if (variant) {
                this.classNames[name] = `transform: var(${variant[1]})`;
                this.processClassname(name);
                this.reponsiveAdd();
                return true;
            }

            // Match: transform with inline value -> transform-[rotate(45deg)]
            const transform = item.match(/^transform-\[(.*?)\]/);
            if (transform) {
                const val = transform[1]
                    .trim()
                    .replace(/\s+/g, " ")
                    .replace(/(;|,)\s+/g, "$1 ");
                this.classNames[name] = "transform:" + val;
                this.processClassname(name);
                this.reponsiveAdd();
                return true;
            }

            // Match: single transform function -> rotate-45, translateX-10
            const transformDynamic = item.match(this.tranformRegex);
            if (transformDynamic) {
                const val = transformDynamic[2].replace(/^-/, "").replace(/-+/g, ", ");
                this.classNames[name] = `transform:${transformDynamic[1]}(${val})`;
                this.processClassname(name);
                this.reponsiveAdd();
            }

            // Match: multiple chained transforms -> transform-rotate-45-translateX-10
            const dynamicChilds = item.match(this.tranformRegexVariant);
            if (dynamicChilds) {
                const data = [...dynamicChilds[1].matchAll(this.tranformRegexChilds)].map(
                    item => `${item[1]}(${item[2].replace(/^-/, "").replace(/-+/g, ", ")})`
                );
                this.classNames[name] = "transform:" + data.join(" ");
                this.processClassname(name);
                this.reponsiveAdd();
                return true;
            }

            return false;
        }

        /**
         * Traverses DOM tree starting from an element and processes class names.
         */
        gotClassName(parent) {
            const queue = [parent];

            while (queue.length > 0) {
                const el = queue.pop();

                el.classList?.forEach(item => {
                    const pre = item.replace(this.pseudo, "");
                    if (this.classNamesList.has(pre) && !this.classNamesListAdded.has(item)) {
                        this.processClassname(item);
                        return;
                    }
                    if (this.processTransform(item)) {
                        return;
                    }
                });

                el.children && Array.from(el.children).forEach(child => queue.push(child));
            }
        }

        /**
         * Observes DOM mutations (class changes, added elements) to inject new rules automatically
         */
        observer() {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && node.classList.length > 0) {
                                this.gotClassName(node);
                            }
                        });
                    }

                    if (mutation.type === "attributes" && mutation.attributeName === "class") {
                        this.gotClassName(mutation.target);
                    }
                });
            });

            observer.observe(document.head.parentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class"]
            });
        }

        // Regex for pseudo-classes like :hover, :focus, :active, etc.
        pseudo = /\:(hover|focus|active|visited|link|checked|disabled|empty|valid|invalid|focus-within)$/;

        /**
         * Process a class name: checks responsive and pseudo modifiers, and injects CSS.
         */
        processClassname(item) {
            if (this.classNamesListAdded.has(item)) return;

            const responsive = item.match(this.matches);
            const pseudo = item.match(this.pseudo);

            if (responsive) {
                const index = this.matchesCodes.indexOf(responsive[1]);
                if (index !== -1) {
                    this.addClass(item, index + 1, pseudo ? pseudo[1] : null);
                }
            } else {
                this.addClass(item, 0, pseudo ? pseudo[1] : null);
            }
        }

        /**
         * Inserts a CSS rule for a given class into the appropriate <style> sheet.
         * @param string - class name
         * @param index - index of stylesheet (breakpoint)
         * @param pseudo - optional pseudo-class (e.g., hover, focus)
         */
        addClass(string, index = 0, pseudo = null) {
            const clearClass = string
                .replace(this.matches, "$2") // Remove responsive prefix
                .replace(this.pseudo, "");   // Remove pseudo-class
            const name = this.classNames[clearClass] ?? null;

            if (name && !this.classNamesListAdded.has(string)) {
                this.classNamesListAdded.add(string);
                const safeClass = string.replace(/([%\[\]\:])/g, "\\$1");
                let rule = "";
                rule = pseudo
                    ? `.${safeClass}:${pseudo}{${name}}`
                    : `.${safeClass}{${name}}`;

                try {
                    this.sheets[index].sheet?.insertRule(
                        rule,
                        this.sheets[index].sheet.cssRules.length
                    );
                } catch (e) {
                    // console.warn("CSS rule rejected:", rule, e)
                }
            }
        }

        /**
         * Initializes default utility classes (colors, spacing, flex, grid, etc.)
         * and starts DOM observation.
         */
        async init() {
            if (this.inited) return;
            this.inited = true;

            // --- Generates a HUGE set of utility classes here ---
            // (text-align, colors, positions, widths, heights, fonts, margins,
            // paddings, borders, radius, flex, grid, shadows, etc.)
            // ...

            this.reponsiveAdd();
            this.observer();
        }

        /**
         * Adds responsive versions of all utility classes (e.g., sm:text-center, xl:mt-4)
         */
        reponsiveAdd() {
            const keys = Object.keys(this.classNames);
            keys.forEach(key => {
                this.classNamesList.add(key);
                this.sizes.map(item => item.code).forEach(item => {
                    this.classNamesList.add(`${item}:${key}`);
                });
            });
        }
    }

    // Initialize and start processing classes
    $observer = new CustomCssSheet();
    if (document.body) {
        $observer.gotClassName(document.body);
    }
})();
