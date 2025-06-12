type presetList = string[];
type styleList = {
    [key: string]: string;
};


class CustomCssSheet {
    inited: boolean = false;
    classNames: styleList = {};
    classNamesList: Set<string> = new Set();
    classNamesListAdded: Set<string> = new Set()
    sheets: HTMLStyleElement[] = [null, 1366, 820, 640].map(item => {
        const $el = document.createElement("style");
        if (item) {
            $el.media = `all and (max-width:${item}px)`;
        }
        document.head.appendChild($el)
        return $el;
    });

    constructor() {
        this.getTranformRegex();
        this.init();
    }

    scapeChars(item: string) {
        return item.replace(/([\\{}:()*+?.,^$|#\[\]\/])/g, '\\$1');
    }

    tranformKeys: string[] = [
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
    ];

    tranformRegex: RegExp = /^$/;

    tranformRegexVariant: RegExp = /^$/;
    tranformRegexChilds: RegExp = /^$/;

    getTranformRegex() {
        const keys = this.tranformKeys.join("|")
        this.tranformRegex = new RegExp(`^(${keys})(-[\\\w|\.|\\\%]+)$`, "i")
        this.tranformRegexChilds = new RegExp(
            `-(${keys})-([\\\w|\.|\\\%]+)+`,
            "ig"
        )
        this.tranformRegexVariant = new RegExp(
            `^transform(-(${keys})(-[\\\w|\.|\\\%]+)+)+$`,
            "i"
        )
    }
    processTransform(item: string): boolean {
        const name = this.scapeChars(item);
        const variant = item.match(/^transform-\((--[a-z0-9\-_]+)\)$/i);
        if (variant) {
            const val = `transform: var(${variant[1]})`;
            this.classNames[name] = val;
            this.processClassname(name);
            this.reponsiveAdd();
            return true;
        }
        const transform = item.match(/^transform-\[(.*?)\]/);
        if (transform) {
            const val = transform[1].trim().replace(/\s+/g, " ").replace(/(;|,)\s+/g, "$1 ");
            this.classNames[name] = "transform:" + val;
            this.processClassname(name);
            this.reponsiveAdd();
            return true;
        };

        const transformDynamic = item.match(this.tranformRegex);
        if (transformDynamic) {
            const val = transformDynamic[2].replace(/^\-/, "").replace(/\-+/g, ", ");
            this.classNames[name] = `transform:${transformDynamic[1]}(${val})`;
            this.processClassname(name);
            this.reponsiveAdd();
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
            this.classNames[name] = val;
            this.processClassname(name)
            this.reponsiveAdd()
            return true;

        }

        return false;
    }

    gotClassName(parent: HTMLElement) {
        const queue = [parent];

        while (queue.length > 0) {
            const el = queue.pop() as HTMLElement;

            el.classList?.forEach(item => {
                if (this.classNamesList.has(item) && !this.classNamesListAdded.has(item)) {
                    this.processClassname(item);
                    return;
                }
                if (this.processTransform(item)) {
                    return;
                }

            });

            el.children && Array.from(el.children).forEach(child => queue.push(child as HTMLElement));
        }
    }


    private observer() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && (node as HTMLElement).classList.length > 0) {
                            this.gotClassName(node as HTMLElement);
                        }
                    });
                }

                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    this.gotClassName(target);
                }
            });
        });

        observer.observe(document.head.parentElement as any, {
            childList: true,
            subtree: true,
            attributes: true,           // 🔥 Esto observa cambios en atributos
            attributeFilter: ['class']  // 🔍 Solo nos importa el atributo 'class'
        });
    }


    processClassname(item: string) {
        if (this.classNamesListAdded.has(item)) {
            return
        }
        const responsive = item.match(/^(xl|md|sm)\:(.*?)$/);
        if (responsive) {
            switch (responsive[1]) {
                case "xl":
                    this.addClass(item, 1);
                    break;
                case "md":
                    this.addClass(item, 2);

                    break;
                case "sm":
                    this.addClass(item, 3);

                    break;

                default:
                    break;
            }
        } else {
            this.addClass(item);
        }
    }

    /**
     * @param string name of the class
     * @param index for desktop | lowdesktop | table | mobile
     */
    addClass(string: string, index: 0 | 1 | 2 | 3 = 0) {
        const clearClass = string.replace(/^(xl|md|sm)\:/, "");
        const name = this.classNames[clearClass] ?? null;

        if (name && !this.classNamesListAdded.has(string)) {
            this.classNamesListAdded.add(string);

            const safeClass = string.replace(/:/g, "\\:");
            const rule = `.${safeClass}{${name}}`;

            try {
                this.sheets[index].sheet?.insertRule(rule, this.sheets[index].sheet.cssRules.length);
            } catch (e) {
                console.warn("CSS rule rejected:", rule, e);
            }
        }
    }

    async init() {
        if (this.inited) {
            return;
        }
        this.inited = true;
        const generals: presetList = ["inherit", "unset", "initial"];
        const colors: presetList = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgrey", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "grey", "green", "greenyellow", "honeydew", "hotpink", "indianred ", "indigo  ", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgrey", "lightgreen", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"];

        const corners: presetList = ["top", "left", "right", "bottom"];
        const aligns: presetList = ["left", "center", "right", "justify", "end", "start"];
        const textAlign: presetList = ([] as string[]).concat(generals, aligns);

        // Text Alignments
        textAlign.forEach(align => {
            this.classNames[`text-${align}`] = `text-align:${align}`;
        });

        // Colors
        colors.forEach(color => {
            ["background", "background-color", "color", "border-color"].forEach(item => {
                this.classNames[`${item}-${color}`] = `${item}:${color}`;
            });
        });

        // Positions
        [...generals, "absolute", "fixed", "relative", "static", "sticky", "revert", "revert-layer"].forEach(item => {
            this.classNames[`position-${item}`] = `position:${item}`;
        });

        const sizes = ["width", "height"];
        for (let index = 0; index < 240; index++) {
            const i = index * 8;
            sizes.forEach((item, or) => {
                const vp = or === 0 ? "vw" : "vh";
                const max = `max-${item}`;
                const min = `min-${item}`;

                this.classNames[`${item}-${i}`] = `${item}: ${i}px`;
                this.classNames[`${max}-${i}`] = `${max}: ${i}px`;
                this.classNames[`${min}-${i}`] = `${min}: ${i}px`;

                this.classNames[`${vp}-min-${i}`] = `${min}: calc(100${vp} - ${i}px)`;
                this.classNames[`${vp}-max-${i}`] = `${max}: calc(100${vp} - ${i}px)`;

                this.classNames[`${vp}-min-${i}\\%`] = `${min}: ${i}${vp}`;
                this.classNames[`${vp}-max-${i}\\%`] = `${max}: ${i}${vp}`;

                // Add auto and full size classes
                if (i === 0) {
                    this.classNames[`${item}-auto`] = `${item}: auto`;
                    this.classNames[`${max}-auto`] = `${max}: auto`;
                    this.classNames[`${item}-full`] = `${item}: 100%`;
                    this.classNames[`${max}-full`] = `${max}: 100%`;
                    this.classNames[`${vp}-${item}-full`] = `${max}: 100${vp}`;
                }
                if (i < 100) {
                    this.classNames[`${item}-${i}\\%`] = `${item}: ${i}%`;
                    this.classNames[`${max}-${i}\\%`] = `${max}: ${i}%`;
                }
            });


            //fonts atts
            if (i > 0) {
                this.classNames[`text-${i}`] = `font-size:${i}px;`;
                this.classNames[`line-height-${i}`] = `line-height:${i};`;
                this.classNames[`line-height-px-${i}`] = `line-height:${i}px;`;
                const domsize = (i / 16).toString().replace(/(^\d+\.\d{0,4}).*?$/, "$1");
                const domname = domsize.replace(/\./g, "_");
                this.classNames[`text-em-${domname}`] = `font-size:${domsize}em;`;
                this.classNames[`text-rem-${domname}`] = `font-size:${domsize}rem;`;
            }
            // Padding and Margin
            this.classNames[`m-${index}`] = `margin:${index}px`;
            this.classNames[`p-${index}`] = `padding:${index}px`;

            this.classNames[`mx-${index}`] = `margin-left:${index}px;margin-right:${index}px`;
            // this.classNames[`ml-${index}`] = `margin-left:${index}px`;
            // this.classNames[`mr-${index}`] = `margin-right:${index}px`;

            this.classNames[`my-${index}`] = `margin-top:${index}px;margin-bottom:${index}px`;
            // this.classNames[`mt-${index}`] = `margin-top:${index}px`;
            // this.classNames[`mb-${index}`] = `margin-bottom:${index}px`;

            this.classNames[`px-${index}`] = `padding-left:${index}px;padding-right:${index}px`;
            // this.classNames[`pl-${index}`] = `padding-left:${index}px`;
            // this.classNames[`pr-${index}`] = `padding-right:${index}px`;

            this.classNames[`py-${index}`] = `padding-top:${index}px;padding-bottom:${index}px`;
            // this.classNames[`pt-${index}`] = `padding-top:${index}px`;
            // this.classNames[`pb-${index}`] = `padding-bottom:${index}px`;

            this.classNames[`border-${index}`] = `border-width:${index}px; border-style:solid`;
            this.classNames[`radius-${index}`] = `border-radius:${index}px`;

            [...corners].forEach((item) => {
                const initial = item[0];
                this.classNames[`p${initial}-${index}`] = `padding-${item}:${index}px`;
                this.classNames[`m${initial}-${index}`] = `margin-${item}:${index}px`;
                this.classNames[`m${initial}-${index}`] = `margin-${item}:${index}px`;
                this.classNames[`border-${initial}-${index}`] = `border-${item}:${index}px;`;
                [...corners].forEach(corner => {
                    //prevents something like border-top-top-radius
                    if (corner == item) {
                        return;
                    }
                    const cornerInitial = corner[0];
                    this.classNames[`border-${initial}${cornerInitial}-${index}`] = `border-${item}-${corner}-radius:${index}px;`;
                })
            });

        }

        // general positions
        const positions: presetList = ["top", "left", "right", "bottom", "inset"];

        positions.forEach((position) => {
            // generate for perscent and pixels
            for (let i = 0; i <= 50; i++) {
                this.classNames[`pos-${position}-${i}%`] = `${position}: ${i}%;`;
                this.classNames[`pos-${position}-${i * 5}px`] = `${position}: ${i * 5}px;`;
            }

            // También agregar clases con valores máximos y específicos
            this.classNames[`pos-${position}-auto`] = `${position}: auto;`;
            this.classNames[`pos-${position}-full`] = `${position}: 100%;`;
        });

        // Posición especial para "inset"
        this.classNames["inset-0"] = "top: 0; right: 0; bottom: 0; left: 0;";
        this.classNames["inset-full"] = "top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%";





        // Font weights
        ['thin', "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"].forEach((weigth, i) => {
            const key = (i + 1) * 100;
            this.classNames[`font-${weigth}`] = `font-weight:${key};`;
        });

        // Display types
        ["block", "flex", "grid", "table"].forEach(item => {
            const prename = "-" + item;
            this.classNames[`display${prename}`] = `display:${item}`;
            this.classNames[`display-inline${prename}`] = `display:inline${prename}`;
        });

        //shadows 
        const calcElevation = (i: number) => {
            return [
                Math.round(i * 2), //horizontalOffset
                Math.round(i * 4), //verticalOffset
                Math.round(i * 6), //blurRadius
                Math.round(i * 2) //spreadRadius
            ];
        }

        const calculateShadow = (i: number, opacity: number = 12) => {
            const [x0, y0, b0, s0] = calcElevation(i);
            const [x1, y1, b1, s1] = calcElevation(i / 2);
            const alpa1 = (opacity / 200).toString().replace(/(^\d+\.\d{0,2}).*?$/, "$1");
            return `${x0}px ${y0}px ${b0}px ${s0}px rgba(0, 0, 0, ${alpa1}), ${x1}px ${y1}px ${b1}px ${s1}px rgba(0, 0, 0, ${alpa1})`;
        }
        
        for (let i = 0; i < 48; i++) {

            //elevation cards
             const data = "box-shadow:" + calculateShadow(i);
            this.classNames[`elevation-${i}`] = data;
            for (let index = 0; index < 101; index++) {
                this.classNames[`elevation-${i}-alpha-${index}`] = "box-shadow:" + calculateShadow(i, index);
            }
        }

        const grid = Array.from(Array(25).keys());
        for (let i = 0; i < grid.length; i++) {
            const repeat = i > 0 ? `repeat(${i}, 1fr)` : "auto";
            this.classNames[`grid-${i}`] = `grid-template-columns:${repeat}`;
            for (let index = 0; index < grid.length; index++) {
                const rowrepeat = index > 0 ? `repeat(${index}, 1fr)` : "auto";
                this.classNames[`grid-${i}-${index}`] = `grid-template-columns:${repeat};grid-template-rows:${rowrepeat}`;
            }

            ["row", "column"].forEach(item => {
                const name = item.substring(0, 3);
                this.classNames[`${name}s-${i}`] = `grid-template-${item}s:${repeat}`;
                //dynamic for grid-start and grid-end
                const endStart = i > 0 ? i : "auto";
                this.classNames[`${name}-start-${i}`] = `grid-${item}-start:${endStart}`;
                this.classNames[`${name}-end-${i}`] = `grid-${item}-end:${endStart}`;

                // dynamic for span 
                const span = `span ${i}`;
                this.classNames[`${name}-${i}`] = `grid-${item}:${i}`;
                if (i > 0) {
                    this.classNames[`${name}-span-${i}`] = `grid-${item}:${span}`;
                    for (let index = 1; index < grid.length; index++) {
                        const spanSecond = `span ${i}`;
                        this.classNames[`${name}-${i}-${index}`] = `grid-${item}:${i}/${index}`;
                        this.classNames[`${name}-span-${i}-${index}`] = `grid-${item}:${span}/${index}`;
                        this.classNames[`${name}-${i}-span-${index}`] = `grid-${item}:${i}/${spanSecond}`;
                        this.classNames[`${name}-span-${i}-span-${index}`] = `grid-${item}:${span}/${spanSecond}`;
                    }
                }
            });
        }

        //gaps space
        for (let i = 0; i < 96; i++) {
            this.classNames[`gap-${i}`] = `gap:${i}px`;
            this.classNames[`row-gap-${i}`] = `row-gap:${i}px`;
            this.classNames[`column-gap-${i}`] = `column-gap:${i}px`;
        }


        // const aligns: presetList = ["left", "center", "right", "justify", "end", "start"];
        const flexAlight = [
            "normal", "center", "flex-start", "flex-end", "space-between",
            "space-around", "space-evenly", "baseline", "stretch"
        ];

        flexAlight.forEach(item => {
            const name = item.replace(/^(\w+\-)+(\w+)/, "$2");

            // Justify Content
            this.classNames[`justify-${name}`] = `justify-content:${item}`;

            // Align Content
            this.classNames[`content-${name}`] = `align-content:${item}`;

            // Align Items
            this.classNames[`items-${name}`] = `align-items:${item}`;

            // Justify Items
            this.classNames[`justify-items-${name}`] = `justify-items:${item}`;
        });



        const keys: presetList = Object.keys(this.classNames);
        const lowdesktop = keys.map(item => `xl:${item}`);
        const tablet = keys.map(item => `md:${item}`);
        const mobile = keys.map(item => `sm:${item}`);

        [...keys, ...lowdesktop, ...tablet, ...mobile].forEach(k => this.classNamesList.add(k));
        this.reponsiveAdd();
        this.observer();
    }



    reponsiveAdd() {
        const keys: presetList = Object.keys(this.classNames);
        const lowdesktop = keys.map(item => `xl:${item}`);
        const tablet = keys.map(item => `md:${item}`);
        const mobile = keys.map(item => `sm:${item}`);
        [...keys, ...lowdesktop, ...tablet, ...mobile].forEach(k => {
            if (!this.classNamesList.has(k)) {
                this.classNamesList.add(k);
            }
        });
    }
}

const globalSheet = new CustomCssSheet();

export { globalSheet }
