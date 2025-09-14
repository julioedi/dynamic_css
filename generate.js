(() => {

    /**
     * https://github.com/julioedi/dynamic_css/
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
        scale = window.dynamiCssScale || 0.25;
        inited = false
        classNames = {}
        classNamesList = new Set()
        classNamesListAdded = new Set()
        sizes = (window.sizes ?? [
            {
                code: "xxl",
                size: 1440,
            },
            {
                code: "xl",
                size: 1366,
            },
            {
                code: "lg",
                size: 1280,
            },
            {
                code: "md",
                size: 1080,
            },
            {
                code: "sm",
                size: 540,
            },
            {
                code: "xs",
                size: 360,
            },

        ]).reverse()
        /**
         * [
         *  "--primary-50";
         * ]
         */
        colors = window?.dynamicCssColors ?? [];

        sheets = [];

        matches = null;
        matchesCodes = [];
        constructor() {
            this.sheets = [null].concat(this.sizes.map(item => item.size)).map(item => {
                const $el = document.createElement("style")
                if (item) {
                    $el.media = `all and (min-width:${item}px)`
                }
                document.head.appendChild($el)
                return $el
            })
            const base = this.sheets[0];
            base.sheet?.insertRule('[class*="grid"]{display:grid}', 0);
            base.sheet?.insertRule('[class*="flex"]{display:flex}', 1);
            let spaces = [];
            for (let i = 0; i < 32; i++) {
                spaces.push(`--sp-${i}:${i * this.scale}rem`);
            }
            spaces = ":root{" + spaces.join(";") + "}";
            base.sheet?.insertRule(spaces, 2);
            this.matchesCodes = this.sizes.map(item => item.code);
            const items = this.matchesCodes.join("|");
            this.matches = new RegExp(`^(${items})\:(.*?)$`)
            this.getTranformRegex();
            this.init()
        }

        scapeChars(item) {
            return item.replace(/([\\{}:()*+?.,^$|#\[\]\/])/g, "\\$1")
        }

        tranformKeys = [
            "matrix",
            "matrix3d",
            "perspective",
            "rotate",
            "rotate3d",
            "rotateX",
            "rotateY",
            "rotateZ",
            "translate",
            "translate3d",
            "translateX",
            "translateY",
            "translateZ",
            "scale",
            "scale3d",
            "scaleX",
            "scaleY",
            "scaleZ",
            "skew",
            "skewX",
            "skewY"
        ]

        tranformRegex = /^$/

        tranformRegexVariant = /^$/
        tranformRegexChilds = /^$/

        getTranformRegex() {
            const keys = this.tranformKeys.join("|")
            this.tranformRegex = new RegExp(`^(${keys})(-[\\\w|\.|\\\%]+)$`, "i")
            this.tranformRegexChilds = new RegExp(`-(${keys})-([\\\w|\.|\\\%]+)+`, "ig")
            this.tranformRegexVariant = new RegExp(
                `^transform(-(${keys})(-[\\\w|\.|\\\%]+)+)+$`,
                "i"
            )
        }
        processTransform(item) {
            const name = this.scapeChars(item)
            const variant = item.match(/^transform-\((--[a-z0-9\-_]+)\)$/i)
            if (variant) {
                const val = `transform: var(${variant[1]})`
                this.classNames[name] = val
                this.processClassname(name)
                this.reponsiveAdd()
                return true
            }
            const transform = item.match(/^transform-\[(.*?)\]/)
            if (transform) {
                const val = transform[1]
                    .trim()
                    .replace(/\s+/g, " ")
                    .replace(/(;|,)\s+/g, "$1 ")
                this.classNames[name] = "transform:" + val
                this.processClassname(name)
                this.reponsiveAdd()
                return true
            }

            const transformDynamic = item.match(this.tranformRegex)
            if (transformDynamic) {
                const val = transformDynamic[2].replace(/^\-/, "").replace(/\-+/g, ", ")
                this.classNames[name] = `transform:${transformDynamic[1]}(${val})`
                this.processClassname(name)
                this.reponsiveAdd()
            }

            const dynamicChilds = item.match(this.tranformRegexVariant)
            if (dynamicChilds) {
                const data = [...dynamicChilds[1].matchAll(this.tranformRegexChilds)].map(
                    item => {
                        return `${item[1]}(${item[2]
                            .replace(/^\-/, "")
                            .replace(/\-+/g, ", ")})`
                    }
                )
                const val = "transform:" + data.join(" ")
                this.classNames[name] = val
                this.processClassname(name)
                this.reponsiveAdd()
                return true
            }

            return false
        }

        gotClassName(parent) {
            const queue = [parent]

            while (queue.length > 0) {
                const el = queue.pop()

                el.classList?.forEach(item => {
                    const pre = item
                        .replace(this.pseudo, "");
                    if (
                        this.classNamesList.has(pre) &&
                        !this.classNamesListAdded.has(item)
                    ) {
                        this.processClassname(item)
                        return
                    }
                    if (this.processTransform(item)) {
                        return
                    }
                })

                el.children && Array.from(el.children).forEach(child => queue.push(child))
            }
        }

        observer() {
            var debounceTimeout = null;
            var queue = [];

            function processQueue(self) {
                while (queue.length > 0) {
                    var el = queue.shift();
                    if (el) self.gotClassName(el);
                }
                debounceTimeout = null;
            }

            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === "childList") {
                        mutation.addedNodes.forEach(function (node) {
                            if (node.nodeType === 1 && node.classList.length > 0) {
                                queue.push(node);
                            }
                        });
                    }

                    if (mutation.type === "attributes" && mutation.attributeName === "class") {
                        queue.push(mutation.target);
                    }
                });

                // Debounce: wait 100ms after the last mutation
                if (debounceTimeout) clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(processQueue, 100, this);
            }.bind(this));

            observer.observe(document.head.parentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class"]
            });
        }


        pseudo = /\:(hover|focus|active|visited|link|checked|disabled|empty|valid|invalid|focus-within)$/
        processClassname(item) {
            if (this.classNamesListAdded.has(item)) {
                return
            }
            const responsive = item.match(this.matches);
            const pseudo = item.match(this.pseudo);

            if (responsive) {
                const index = this.matchesCodes.indexOf(responsive[1]);
                if (index !== -1) {
                    this.addClass(item, index + 1, pseudo ? pseudo[1] : null);
                }

            } else {
                this.addClass(item, 0, pseudo ? pseudo[1] : null)
            }
        }

        /**
         * @param string name of the class
         * @param index for desktop | lowdesktop | table | mobile
         */
        addClass(string, index = 0, pseudo = null) {
            const clearClass = string
                .replace(this.matches, "$2")//remove responsive like sm|xxl
                .replace(this.pseudo, ""); //remove pseudo classes
            const name = this.classNames[clearClass] ?? null

            if (name && !this.classNamesListAdded.has(string)) {
                this.classNamesListAdded.add(string)
                const safeClass = string.replace(/([%\[\]\:])/g, "\\$1")
                let rule = "";
                if (pseudo) {
                    rule += `.${safeClass}:${pseudo}{${name}}`
                } else {
                    rule = `.${safeClass}{${name}}`
                }

                try {
                    this.sheets[index].sheet?.insertRule(
                        rule,
                        this.sheets[index].sheet.cssRules.length
                    )
                } catch (e) {
                    // console.warn("CSS rule rejected:", rule, e)
                }
            }
        }

        async init() {
            if (this.inited) {
                return
            }

            let printed = false;
            this.inited = true
            const generals = ["inherit", "unset", "initial"]
            const colors = [
                "aliceblue",
                "antiquewhite",
                "aqua",
                "aquamarine",
                "azure",
                "beige",
                "bisque",
                "black",
                "blanchedalmond",
                "blue",
                "blueviolet",
                "brown",
                "burlywood",
                "cadetblue",
                "chartreuse",
                "chocolate",
                "coral",
                "cornflowerblue",
                "cornsilk",
                "crimson",
                "cyan",
                "darkblue",
                "darkcyan",
                "darkgoldenrod",
                "darkgray",
                "darkgrey",
                "darkgreen",
                "darkkhaki",
                "darkmagenta",
                "darkolivegreen",
                "darkorange",
                "darkorchid",
                "darkred",
                "darksalmon",
                "darkseagreen",
                "darkslateblue",
                "darkslategray",
                "darkslategrey",
                "darkturquoise",
                "darkviolet",
                "deeppink",
                "deepskyblue",
                "dimgray",
                "dimgrey",
                "dodgerblue",
                "firebrick",
                "floralwhite",
                "forestgreen",
                "fuchsia",
                "gainsboro",
                "ghostwhite",
                "gold",
                "goldenrod",
                "gray",
                "grey",
                "green",
                "greenyellow",
                "honeydew",
                "hotpink",
                "indianred ",
                "indigo  ",
                "ivory",
                "khaki",
                "lavender",
                "lavenderblush",
                "lawngreen",
                "lemonchiffon",
                "lightblue",
                "lightcoral",
                "lightcyan",
                "lightgoldenrodyellow",
                "lightgray",
                "lightgrey",
                "lightgreen",
                "lightpink",
                "lightsalmon",
                "lightseagreen",
                "lightskyblue",
                "lightslategray",
                "lightslategrey",
                "lightsteelblue",
                "lightyellow",
                "lime",
                "limegreen",
                "linen",
                "magenta",
                "maroon",
                "mediumaquamarine",
                "mediumblue",
                "mediumorchid",
                "mediumpurple",
                "mediumseagreen",
                "mediumslateblue",
                "mediumspringgreen",
                "mediumturquoise",
                "mediumvioletred",
                "midnightblue",
                "mintcream",
                "mistyrose",
                "moccasin",
                "navajowhite",
                "navy",
                "oldlace",
                "olive",
                "olivedrab",
                "orange",
                "orangered",
                "orchid",
                "palegoldenrod",
                "palegreen",
                "paleturquoise",
                "palevioletred",
                "papayawhip",
                "peachpuff",
                "peru",
                "pink",
                "plum",
                "powderblue",
                "purple",
                "rebeccapurple",
                "red",
                "rosybrown",
                "royalblue",
                "saddlebrown",
                "salmon",
                "sandybrown",
                "seagreen",
                "seashell",
                "sienna",
                "silver",
                "skyblue",
                "slateblue",
                "slategray",
                "slategrey",
                "snow",
                "springgreen",
                "steelblue",
                "tan",
                "teal",
                "thistle",
                "tomato",
                "turquoise",
                "violet",
                "wheat",
                "white",
                "whitesmoke",
                "yellow",
                "yellowgreen"
            ]

            const aligns = ["left", "center", "right", "justify", "end", "start"]
            const textAlign = [].concat(generals, aligns)

            // Text Alignments
            textAlign.forEach(align => {
                this.classNames[`text-${align}`] = `text-align:${align}`
            })

            // Colors
            colors.forEach(color => {
                this.classNames[`bg-${color}`] = `background-color:${color}`;
                this.classNames[`border-${color}`] = `border-color:${color}`;
                this.classNames[`color-${color}`] = `color:${color}`;
                this.classNames[`outline-${color}`] = `outline-color:${color}`;
            });
            this.colors.forEach(color => {
                this.classNames[`bg-${color}`] = `background-color:var(--${color})`;
                this.classNames[`border-${color}`] = `border-color:var(--${color})`;
                this.classNames[`color-${color}`] = `color:var(--${color})`;
                this.classNames[`outline-${color}`] = `outline-color:var(--${color})`;
            });

            // Positions
            [
                ...generals,
                "absolute",
                "fixed",
                "relative",
                "static",
                "sticky",
                "revert",
                "revert-layer"
            ].forEach(item => {
                this.classNames[`position-${item}`] = `position:${item}`
            })

            const sizes = ["width", "height"];
            const initials = ["w", "h"];
            for (let index = 0; index < 241; index++) {
                const i = index * this.scale;
                sizes.forEach((item, or) => {
                    const vp = or === 0 ? "vw" : "vh";
                    const max = `max-${initials[or]}`
                    const min = `min-${initials[or]}`

                    this.classNames[`${initials[or]}-${index}`] = `${item}:${i}rem`
                    this.classNames[`${max}-${index}`] = `${max}:${i}rem`
                    this.classNames[`${min}-${index}`] = `${min}:${i}rem`
                    this.classNames[`${vp}-min-${index}`] = `${min}:calc(100${vp} - ${i}rem)`
                    this.classNames[`${vp}-max-${index}`] = `${max}:calc(100${vp} - ${i}rem)`

                    this.classNames[`${vp}-min-${index}%`] = `${min}:${i}${vp}`
                    this.classNames[`${vp}-max-${index}%`] = `${max}:${i}${vp}`

                    // Add auto and full size classes
                    if (i === 0) {
                        this.classNames[`${initials[or]}-auto`] = `${item}:auto`
                        this.classNames[`${max}-auto`] = `${max}:auto`
                        this.classNames[`${initials[or]}-full`] = `${item}:100%`
                        this.classNames[`${max}-full`] = `${max}:100%`
                        this.classNames[`${vp}-${initials[or]}-full`] = `${max}:100${vp}`
                    }
                    if (i < 101) {
                        this.classNames[`${initials[or]}-${index}%`] = `${item}:${index}%`
                        this.classNames[`${max}-${initials[or]}%`] = `${max}:${index}%`
                    }

                })

                //fonts atts
                if (i > 0) {
                    this.classNames[`text-${index}`] = `font-size:${i}rem;`
                    this.classNames[`lh-${index}`] = `line-height:${index};`
                    this.classNames[`lh-rem-${index}`] = `line-height:${i}rem;`
                    const domsize = (i / 16).toString().replace(/(^\d+\.\d{0,4}).*?$/, "$1")
                    const domname = domsize.replace(/\./g, "_")
                    this.classNames[`text-em-${domname}`] = `font-size:${domsize}em;`
                    this.classNames[`text-rem-${domname}`] = `font-size:${domsize}rem;`
                }
                const withNegative = ($data = [], limit = null) => {
                    if (limit && limit > index) {
                        return;
                    }
                    let separator = "";
                    for (let negative = 0; negative < 2; negative++) {
                        separator += "-";
                        $data.forEach(el => {
                            const percent = el?.[2] || false;
                            const last = percent ? index : i;
                            let size = negative == 0 ? last : last * -1;
                            const name = `${el[0]}${separator}${index}${percent ? "%" : ""}`;
                            this.classNames[name] = el[1].replaceAll("{{s}}", size);
                        })
                    }
                }

                const pm = ["padding", "margin"];
                const pmInitials = ["p", "m"];
                pm.forEach((item, or) => {
                    const prefix = pmInitials[or];
                    withNegative([
                        [prefix, `${item}:{{s}}rem`],
                        [`${prefix}x`, `${item}-left:{{s}}rem;${item}-right:{{s}}rem`],
                        [`${prefix}y`, `${item}-top:{{s}}rem;${item}-bottom:{{s}}rem`],
                        [`${prefix}t`, `${item}-top:{{s}}rem`],
                        [`${prefix}b`, `${item}-bottom:{{s}}rem`],
                        [`${prefix}l`, `${item}-left:{{s}}rem`],
                        [`${prefix}r`, `${item}-right:{{s}}rem`],
                    ]);
                })
                if (i < 33) {
                    this.classNames[`border-${index}`] = `border-width:${i}rem`;
                }
                this.classNames[`rounded-${index}`] = `border-radius:${i}rem`;
                this.classNames[`rounded-t-${index}`] = `border-top-left-radius:${i}rem;border-top-right-radius:${i}rem`;
                this.classNames[`rounded-b-${index}`] = `border-bottom-left-radius:${i}rem;border-bottom-right-radius:${i}rem`;
                this.classNames[`rounded-l-${index}`] = `border-bottom-left-radius:${i}rem;border-top-left-radius:${i}rem;`;
                this.classNames[`rounded-r-${index}`] = `border-bottom-right-radius:${i}rem;border-top-right-radius:${i}rem;`;

                this.classNames[`rounded-tl-${index}`] = `border-top-left-radius:${i}rem`;
                this.classNames[`rounded-tr-${index}`] = `border-top-right-radius:${i}rem`;
                this.classNames[`rounded-bl-${index}`] = `border-bottom-left-radius:${i}rem`;
                this.classNames[`rounded-br-${index}`] = `border-bottom-right-radius:${i}rem`;



                // general positions
                const positions = ["inset", "top", "left", "right", "bottom"];
                positions.forEach((position, or) => {
                    withNegative([
                        [position, `${position}:{{s}}%`, true],
                        [position, `${position}:{{s}}rem`],
                    ]);

                    if (index === 0) {
                        // También agregar clases con valores máximos y específicos
                        this.classNames[`${position}-auto`] = `${position}:auto;`
                        this.classNames[`${position}-full`] = `${position}:100%;`
                    }
                })

            }

            // Font weights
            [
                "thin",
                "extralight",
                "light",
                "normal",
                "medium",
                "semibold",
                "bold",
                "extrabold",
                "black"
            ].forEach((weigth, i) => {
                const key = (i + 1) * 100
                this.classNames[`font-${weigth}`] = `font-weight:${key};`
            });

            // Display types
            ["block", "flex", "grid", "table"].forEach(item => {
                const prename = "-" + item
                this.classNames[`${prename}`] = `display:${item}`;
                this.classNames[`inline${prename}`] = `display:inline${prename}`
            })
            this.classNames[`row`] = `display:flex:flex-wrap:wrap;`;
            this.classNames[`col`] = `flex:1 0 0%`;
            for (let index = 1; index < 13; index++) {
                this.classNames[`col-${index}`] = `flex:0 0 auto;width:${100 / 12}%`;
            }


            //shadows
            const calcElevation = i => {
                return [
                    Math.round(i * 2), //horizontalOffset
                    Math.round(i * 4), //verticalOffset
                    Math.round(i * 6), //blurRadius
                    Math.round(i * 2) //spreadRadius
                ]
            }

            const calculateShadow = (i, opacity = 12) => {
                const [x0, y0, b0, s0] = calcElevation(i)
                const [x1, y1, b1, s1] = calcElevation(i / 2)
                const alpa1 = (opacity / 200)
                    .toString()
                    .replace(/(^\d+\.\d{0,2}).*?$/, "$1")
                return `${x0}rem ${y0}rem ${b0}rem ${s0}rem rgba(0, 0, 0, ${alpa1}), ${x1}rem ${y1}rem ${b1}rem ${s1}rem rgba(0, 0, 0, ${alpa1})`
            }

            for (let i = 0; i < 48; i++) {
                //elevation cards
                const data = "box-shadow:" + calculateShadow(i)
                this.classNames[`elevation-${i}`] = data
                for (let index = 0; index < 101; index++) {
                    this.classNames[`elevation-${i}-alpha-${index}`] =
                        "box-shadow:" + calculateShadow(i, index)
                }
            }

            const grid = Array.from(Array(12).keys())
            for (let i = 0; i < grid.length; i++) {
                const repeat = i > 0 ? `repeat(${i}, 1fr)` : "auto"
                this.classNames[`grid-${i}`] = `grid-template-columns:${repeat}`
                for (let index = 0; index < grid.length; index++) {
                    const rowrepeat = index > 0 ? `repeat(${index}, 1fr)` : "auto"
                    this.classNames[`grid-${i}-${index}`] = `grid-template-columns:${repeat};grid-template-rows:${rowrepeat}`
                }

                ["row", "column"].forEach(item => {
                    const name = item.substring(0, 3)
                    this.classNames[`${name}s-${i}`] = `grid-template-${item}s:${repeat}`
                    //dynamic for grid-start and grid-end
                    const endStart = i > 0 ? i : "auto"
                    this.classNames[`${name}-start-${i}`] = `grid-${item}-start:${endStart}`
                    this.classNames[`${name}-end-${i}`] = `grid-${item}-end:${endStart}`

                    // dynamic for span
                    const span = `span ${i}`
                    this.classNames[`grid-${name}-${i}`] = `grid-${item}:${i}`
                    if (i > 0) {
                        this.classNames[`${name}-span-${i}`] = `grid-${item}-start:${span}`
                        for (let index = 1; index < grid.length; index++) {
                            const spanSecond = `span ${i}`
                            this.classNames[`${name}-${i}-${index}`] = `grid-${item}:${i}/${index}`
                            this.classNames[`${name}-span-${i}-${index}`] = `grid-${item}:${span}/${index}`
                            this.classNames[`${name}-${i}-span-${index}`] = `grid-${item}:${i}/${spanSecond}`
                            this.classNames[`${name}-span-${i}-span-${index}`] = `grid-${item}:${span}/${spanSecond}`
                        }
                    }
                })
            }

            //gaps space
            for (let i = 0; i < 96; i++) {
                this.classNames[`gap-${i}`] = `gap:${i}rem`
                this.classNames[`row-gap-${i}`] = `row-gap:${i}rem`
                this.classNames[`column-gap-${i}`] = `column-gap:${i}rem`
            }

            // const aligns: presetList = ["left", "center", "right", "justify", "end", "start"];
            const flexAlight = [
                "normal",
                "center",
                "flex-start",
                "flex-end",
                "space-between",
                "space-around",
                "space-evenly",
                "baseline",
                "stretch"
            ]

            flexAlight.forEach(item => {
                const name = item.replace(/^(\w+\-)+(\w+)/, "$2")

                // Justify Content
                this.classNames[`justify-${name}`] = `justify-content:${item}`;

                // Align Content
                this.classNames[`content-${name}`] = `align-content:${item}`;

                // Align Items
                this.classNames[`items-${name}`] = `align-items:${item}`;

                // Justify Items
                this.classNames[`justify-items-${name}`] = `justify-items:${item}`;
            })

            this.reponsiveAdd()
            this.observer()
        }

        reponsiveAdd() {

            const keys = Object.keys(this.classNames)
            keys.forEach(key => {
                this.classNamesList.add(key);
                this.sizes.map(item => item.code).forEach(item => {
                    this.classNamesList.add(`${item}:${key}`);
                })
            });
        }
    }

    $observer = new CustomCssSheet();
    if (document.body) {
        $observer.gotClassName(document.body)
    }
})()
