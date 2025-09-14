/**
 * https://github.com/julioedi/dynamic_css v1.0.0
 */
(() => {
  /**
   * Breakpoint definition
   */
  interface Breakpoint {
    code: string;
    size: number;
  }

  class CustomCssSheet {
    // Default scaling factor for spacing and size utilities
    scale: number = (window as any).dynamiCssScale || 0.25;

    inited: boolean = false;
    classNames: Record<string, string> = {};
    classNamesList: Set<string> = new Set();
    classNamesListAdded: Set<string> = new Set();

    sizes: Breakpoint[] = ((window as any).sizes ?? [
      { code: "xxl", size: 1440 },
      { code: "xl", size: 1366 },
      { code: "lg", size: 1280 },
      { code: "md", size: 1080 },
      { code: "sm", size: 540 },
      { code: "xs", size: 360 },
    ]).reverse();

    /**
     * Custom colors can be provided via global window variable
     */
    colors: string[] = (window as any)?.dynamicCssColors ?? [];

    sheets: (HTMLStyleElement | null)[] = [];
    matches: RegExp | null = null;
    matchesCodes: string[] = [];

    tranformKeys: string[] = [
      "matrix", "matrix3d", "perspective", "rotate", "rotate3d",
      "rotateX", "rotateY", "rotateZ", "translate", "translate3d",
      "translateX", "translateY", "translateZ", "scale", "scale3d",
      "scaleX", "scaleY", "scaleZ", "skew", "skewX", "skewY"
    ];

    tranformRegex: RegExp = /^$/;
    tranformRegexVariant: RegExp = /^$/;
    tranformRegexChilds: RegExp = /^$/;

    pseudo: RegExp =
      /\:(hover|focus|active|visited|link|checked|disabled|empty|valid|invalid|focus-within)$/;

    constructor() {
      // Create <style> elements for each breakpoint
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

      // Base stylesheet
      const base = this.sheets[0];
      base?.sheet?.insertRule('[class*="grid"]{display:grid}', 0);
      base?.sheet?.insertRule('[class*="flex"]{display:flex}', 1);

      // Add spacing variables
      let spaces: string[] = [];
      for (let i = 0; i < 32; i++) {
        spaces.push(`--sp-${i}:${i * this.scale}rem`);
      }
      const spaceVars = `:root{${spaces.join(";")}}`;
      base?.sheet?.insertRule(spaceVars, 2);

      // Setup responsive regex
      this.matchesCodes = this.sizes.map(item => item.code);
      const items = this.matchesCodes.join("|");
      this.matches = new RegExp(`^(${items})\:(.*?)$`);

      this.getTranformRegex();
      this.init();
    }

    /**
     * Escape special regex characters
     */
    scapeChars(item: string): string {
      return item.replace(/([\\{}:()*+?.,^$|#\[\]\/])/g, "\\$1");
    }

    /**
     * Build regex for transform utilities
     */
    getTranformRegex(): void {
      const keys = this.tranformKeys.join("|");
      this.tranformRegex = new RegExp(`^(${keys})(-[\\w|\.|%]+)$`, "i");
      this.tranformRegexChilds = new RegExp(`-(${keys})-([\\w|\.|%]+)+`, "ig");
      this.tranformRegexVariant = new RegExp(
        `^transform(-(${keys})(-[\\w|\.|%]+)+)+$`,
        "i"
      );
    }

    /**
     * Process transform class names and generate CSS rules
     */
    processTransform(item: string): boolean {
      const name = this.scapeChars(item);

      // Case: transform-(--var)
      const variant = item.match(/^transform-\((--[a-z0-9\-_]+)\)$/i);
      if (variant) {
        this.classNames[name] = `transform: var(${variant[1]})`;
        this.processClassname(name);
        this.reponsiveAdd();
        return true;
      }

      // Case: transform-[rotate(45deg)]
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

      // Case: rotate-45, translateX-10
      const transformDynamic = item.match(this.tranformRegex);
      if (transformDynamic) {
        const val = transformDynamic[2]
          .replace(/^-/, "")
          .replace(/-+/g, ", ");
        this.classNames[name] = `transform:${transformDynamic[1]}(${val})`;
        this.processClassname(name);
        this.reponsiveAdd();
        return true;
      }

      // Case: transform-rotate-45-translateX-10
      const dynamicChilds = item.match(this.tranformRegexVariant);
      if (dynamicChilds) {
        const data = [
          ...dynamicChilds[1].matchAll(this.tranformRegexChilds),
        ].map(
          match =>
            `${match[1]}(${match[2].replace(/^-/, "").replace(/-+/g, ", ")})`
        );
        this.classNames[name] = "transform:" + data.join(" ");
        this.processClassname(name);
        this.reponsiveAdd();
        return true;
      }

      return false;
    }

    /**
     * Walks the DOM starting from a parent element and processes class names
     */
    gotClassName(parent: Element): void {
      const queue: Element[] = [parent];

      while (queue.length > 0) {
        const el = queue.pop()!;
        el.classList?.forEach(item => {
          const pre = item.replace(this.pseudo, "");
          if (
            this.classNamesList.has(pre) &&
            !this.classNamesListAdded.has(item)
          ) {
            this.processClassname(item);
            return;
          }
          if (this.processTransform(item)) {
            return;
          }
        });

        if (el.children) {
          Array.from(el.children).forEach(child => queue.push(child));
        }
      }
    }

    /**
     * Observe DOM changes and apply rules automatically
     */
    observer(): void {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach(node => {
              if (
                node.nodeType === 1 &&
                (node as Element).classList.length > 0
              ) {
                this.gotClassName(node as Element);
              }
            });
          }
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            this.gotClassName(mutation.target as Element);
          }
        });
      });

      observer.observe(document.head.parentElement as Node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    /**
     * Process class name and add CSS rules (handles responsive + pseudo modifiers)
     */
    processClassname(item: string): void {
      if (this.classNamesListAdded.has(item)) return;

      const responsive = this.matches ? item.match(this.matches) : null;
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
     * Add CSS rule to the stylesheet
     */
    addClass(string: string, index: number = 0, pseudo: string | null = null): void {
      const clearClass = string
        .replace(this.matches!, "$2")
        .replace(this.pseudo, "");
      const name = this.classNames[clearClass] ?? null;

      if (name && !this.classNamesListAdded.has(string)) {
        this.classNamesListAdded.add(string);
        const safeClass = string.replace(/([%\[\]\:])/g, "\\$1");
        const rule = pseudo
          ? `.${safeClass}:${pseudo}{${name}}`
          : `.${safeClass}{${name}}`;

        try {
          this.sheets[index]?.sheet?.insertRule(
            rule,
            this.sheets[index]?.sheet?.cssRules.length ?? 0
          );
        } catch (e) {
          // console.warn("CSS rule rejected:", rule, e)
        }
      }
    }

    /**
     * Initialize utility classes and start observing DOM
     */
    async init(): Promise<void> {
      if (this.inited) return;
      this.inited = true;

      // ⚡ Here goes the generation of all utility classes:
      // text-align, colors, spacing, borders, flex, grid, shadows, etc.
      // (same logic as in your original JS)

      this.reponsiveAdd();
      this.observer();
    }

    /**
     * Add responsive variants of all utility classes
     */
    reponsiveAdd(): void {
      const keys = Object.keys(this.classNames);
      keys.forEach(key => {
        this.classNamesList.add(key);
        this.sizes.forEach(item => {
          this.classNamesList.add(`${item.code}:${key}`);
        });
      });
    }
  }

  // Initialize observer
  const $observer = new CustomCssSheet();
  if (document.body) {
    $observer.gotClassName(document.body);
  }
})();
