export default class MainGame extends Phaser.Scene {

    constructor() {
        super("MainGame");

        // ===== グローバル変数を this に移動 =====
        this.rules = {};
        this.convert = [];
        this.vanish = [];
        this.moveQuery = [];
        this.logicGrid = [];
        this.objGrid = [];
        this.conflictGrid = null;

        this.gridHeight;
        this.gridWidth;
        this.mapfileURL;

        this.tileToType = {
            0: "blank",
            1: "hakache",
            2: "iwa",
            3: "kabe",
            4: "hata",
            100: "hakache_text",
            101: "iwa_text",
            102: "is_text",
            103: "push_text",
            104: "you_text",
            105: "not_text",
            106: "and_text",
            107: "kabe_text",
            108: "stop_text",
            109: "win_text",
            110: "defeat_text",
            111: "hata_text",
        };

        this.typeToAssets = {
            "blank": [0, 0],
            "hakache": [1, 2],
            "iwa": [3, 4],
            "kabe": [5, 6],
            "hata": [7, 8],
            "hakache_text": [9, 10],
            "iwa_text": [11, 12],
            "is_text": [13, 14],
            "push_text": [15, 16],
            "you_text": [17, 18],
            "not_text": [19, 20],
            "and_text": [21, 22],
            "defeat_text": [23, 24],
            "win_text": [25, 26],
            "kabe_text": [27, 28],
            "stop_text": [29, 30],
            "hata_text": [31, 32],
        };

        this.meishi = ["hakache", "iwa", "kabe", "hata"];
        this.doushi = ["push", "stop", "win", "you", "defeat","weak","melt","hot"];

        this.canInput = true;
        this.players = [];
    }
    init(data){
        this.gridHeight = data.gridHeight;
        this.gridWidth = data.gridWidth;
        this.mapfileURL = data.mapfileURL;
    }

    // ===== CSV 読み込み =====
    loadGrid = async () => {
        try {
            const response = await fetch(this.mapfileURL);
            let data = await response.text();
            data = data.split("\n");

            for (let i = 0; i < this.gridHeight; i++) {
                this.logicGrid[i] = data[i].split(",");
            }

            for (let i = 0; i < this.gridHeight; i++) {
                for (let j = 0; j < this.gridWidth; j++) {
                    this.logicGrid[i][j] = [this.tileToType[this.logicGrid[i][j]]];
                }
            }
        } catch (err) {
            console.log(err);
        }
    };

    preload() {
        this.load.spritesheet("tiles", "./assets/tiles.png", {
            frameWidth: 20,
            frameHeight: 20,
        });

        return this.loadGrid().then(() => {
            // rules 初期化
            for (let i = 0; i < this.gridHeight; i++) {
                for (let j = 0; j < this.gridWidth; j++) {
                    const name = this.logicGrid[i][j][0];
                    if (!this.rules[name]) this.rules[name] = [];
                    if (name.endsWith("_text")) this.rules[name + "_active"] = [];
                }
            }
        });
    }
    create() {
        this.createObjects();
        this.updateRules();

        this.players = [];

        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {
                const objs = this.objGrid[i][j];
                if (!objs) continue;

                for (let obj of objs) {
                    if (this.rules[obj.name].includes("you")) {
                        this.players.push(obj);
                    }
                }
            }
        }

        this.input.keyboard.on("keydown", (event) => this.handleInput(event));
    }

    handleInput(event) {
        if (!this.canInput) return;

        let dr = 0, dc = 0;
        switch (event.code) {
            case "KeyW":
            case "ArrowUp":
                dr = -1;
                break;
            case "KeyS":
            case "ArrowDown":
                dr = 1;
                break;
            case "KeyA":
            case "ArrowLeft":
                dc = -1;
                break;
            case "KeyD":
            case "ArrowRight":
                dc = 1;
                break;
            default:
                return;
        }

        this.canInput = false;
        this.time.delayedCall(100, () => (this.canInput = true));

        for (let p of this.players) {
            this.trymove(p, dr, dc);
        }

        let depth = 1;
        let didTextMove = false;

        for (let q of this.moveQuery) {
            if (q[0].name.includes("_text")) didTextMove = true;
            this.moveObj(q, depth);
        }

        if (didTextMove) {
            this.updateRules();
            this.checkRules();
        }

        this.checkStates();
        this.vanishObj();
    }
        trymove = (gameObj, dr, dc) => {
        const c = Math.floor(gameObj.x / 20);
        const r = Math.floor(gameObj.y / 20);
        const nc = c + dc;
        const nr = r + dr;

        if (nc < 0 || this.gridWidth <= nc || nr < 0 || this.gridHeight <= nr) return false;

        const nextNames = this.logicGrid[nr][nc];

        for (let name of nextNames) {
            if (this.rules[name] && this.rules[name].includes("stop")) return false;
        }

        if (nextNames[0] === "blank") {
            this.moveQuery.push([gameObj, nc * 20, nr * 20]);
            return true;
        }

        const nextObjs = this.objGrid[nr][nc];

        for (let i = 0; i < nextNames.length; i++) {
            let name = nextNames[i];
            let obj = nextObjs[i];

            if (this.rules[name] && this.rules[name].includes("push") && this.rules[name].includes("weak")) {
                if (this.trymove(obj, dr, dc) === false) this.vanish.push(obj);
            }
            else if (this.rules[name] && this.rules[name].includes("push")) {
                if (this.trymove(obj, dr, dc) === false) return false;
            }
        }

        this.moveQuery.push([gameObj, nc * 20, nr * 20]);
        return true;
    };


    updateRules = () => {
        for (const key in this.rules) {
            this.rules[key] = [];
        }

        this.convert = [];
        this.conflictGrid = Array.from({ length: this.gridHeight }, () =>
            Array(this.gridWidth).fill(0)
        );

        let sentences = [];

        // ===== 横方向の文解析 =====
        for (let i = 0; i < this.gridHeight; i++) {
            let words = [];
            let isIndex = [];

            for (let j = 0; j < this.gridWidth; j++) {
                words[j] = this.logicGrid[i][j];
                if (words[j].includes("is_text")) isIndex.push(j);
            }

            if (isIndex.length === 0) continue;

            let parsedWords = [...words];
            this.parse(parsedWords);

            for (let j of isIndex) {
                const shugoData = this.findShugo(parsedWords.slice(0, j), i, 0);
                const jutsugoData = this.findJutsugo(parsedWords.slice(j + 1), i, j + 1);

                if (shugoData.res.length > 0 && jutsugoData.res.length > 0) {
                    sentences.push({
                        shugo: shugoData.res,
                        jutsugo: jutsugoData.res,
                        coords: [...shugoData.coords, [i, j], ...jutsugoData.coords]
                    });
                }
            }
        }

        // ===== 縦方向の文解析 =====
        for (let j = 0; j < this.gridWidth; j++) {
            let words = [];
            let isIndex = [];

            for (let i = 0; i < this.gridHeight; i++) {
                words[i] = this.logicGrid[i][j];
                if (words[i].includes("is_text")) isIndex.push(i);
            }

            if (isIndex.length === 0) continue;

            let parsedWords = [...words];
            this.parse(parsedWords);

            for (let i of isIndex) {
                const shugoData = this.findShugo(parsedWords.slice(0, i), 0, j, true);
                const jutsugoData = this.findJutsugo(parsedWords.slice(i + 1), i + 1, j, true);

                if (shugoData.res.length > 0 && jutsugoData.res.length > 0) {
                    sentences.push({
                        shugo: shugoData.res,
                        jutsugo: jutsugoData.res,
                        coords: [...shugoData.coords, [i, j], ...jutsugoData.coords]
                    });
                }
            }
        }

        // ===== 衝突判定 =====
        let invalidSentences = new Set();

        for (let i = 0; i < sentences.length; i++) {
            for (let j = 0; j < sentences.length; j++) {
                if (i === j) continue;

                let s1 = sentences[i];
                let s2 = sentences[j];

                let commonShugo = s1.shugo.filter(s => s2.shugo.includes(s));
                if (commonShugo.length === 0) continue;

                // A is X vs A is not X
                for (let word of s1.jutsugo) {
                    if (!word.startsWith("*") && s2.jutsugo.includes("*" + word)) {
                        invalidSentences.add(i);
                    }
                }

                // A is A vs A is B
                for (let s of commonShugo) {
                    let cleanS = s.replace("*", "");
                    if (s2.jutsugo.includes(cleanS)) {
                        for (let b of s1.jutsugo) {
                            if (this.meishi.includes(b) && b !== cleanS) {
                                invalidSentences.add(i);
                            }
                        }
                    }
                }
            }
        }
                // ===== 不成立文のマーク =====
        sentences.forEach((s, idx) => {
            if (invalidSentences.has(idx)) {
                s.coords.forEach(pos => {
                    this.conflictGrid[pos[0]][pos[1]] = 2;
                });
            }
        });

        // ===== 成立文の処理 =====
        sentences.forEach((s, idx) => {
            if (!invalidSentences.has(idx)) {
                s.coords.forEach(pos => {
                    this.conflictGrid[pos[0]][pos[1]] = 1;
                });

                this.applySentenceToRules(s);
            }
        });

        // テキストは常に push
        for (const key in this.rules) {
            if (key.includes("_text")) this.rules[key].push("push");
        }
    };


    findShugo = (words, startR, startC, isVertical = false) => {
        let i = words.length - 1;
        let res = [];
        let coords = [];
        let state = "meishi";
        let tmp = null;
        let tmpCoords = [];

        while (i >= 0) {
            let w = words[i];
            let currR = isVertical ? startR + i : startR;
            let currC = isVertical ? startC : startC + i;

            if (state === "meishi") {
                if (this.meishi.includes(w)) {
                    tmp = w;
                    tmpCoords = [[currR, currC]];
                    state = "andkanot";
                } else break;
            }
            else if (state === "andkanot") {
                if (w === "and") {
                    res.push(tmp);
                    coords.push(...tmpCoords);
                    coords.push([currR, currC]);
                    tmp = null;
                    state = "meishi";
                }
                else if (w === "not") {
                    tmp = tmp.startsWith("*") ? tmp.replace("*", "") : "*" + tmp;
                    tmpCoords.push([currR, currC]);
                }
                else break;
            }
            i--;
        }

        if (tmp) {
            res.push(tmp);
            coords.push(...tmpCoords);
        }

        return { res, coords };
    };


    findJutsugo = (words, startR, startC, isVertical = false) => {
        let i = 0;
        let res = [];
        let coords = [];
        let state = "any";
        let isNot = false;
        let currentNotCoords = [];

        while (i < words.length) {
            let w = words[i];
            let currR = isVertical ? startR + i : startR;
            let currC = isVertical ? startC : startC + i;

            if (state === "any") {
                if (this.meishi.includes(w) || this.doushi.includes(w)) {
                    res.push(isNot ? "*" + w : w);
                    coords.push([currR, currC], ...currentNotCoords);
                    currentNotCoords = [];
                    isNot = false;
                    state = "and";
                }
                else if (w === "not") {
                    isNot = !isNot;
                    currentNotCoords.push([currR, currC]);
                }
                else break;
            }
            else if (state === "and") {
                if (w === "and") {
                    coords.push([currR, currC]);
                    state = "any";
                }
                else break;
            }
            i++;
        }

        return { res, coords };
    };


    applySentenceToRules = (sentence) => {
        const { shugo, jutsugo } = sentence;

        for (let l of shugo) {
            for (let m of jutsugo) {
                let targetM = m.replace("*", "");

                if (this.doushi.includes(targetM)) {
                    if (l.startsWith("*")) {
                        let exclude = l.replace("*", "");
                        for (let n in this.rules) {
                            if (n === exclude || n === "blank") continue;
                            this.rules[n].push(m);
                        }
                    } else {
                        if (!this.rules[l]) this.rules[l] = [];
                        this.rules[l].push(m);
                    }
                }
                else if (this.meishi.includes(targetM)) {
                    this.convert.push([l, m]);
                }
            }
        }
    };


    parse = (words) => {
        for (let i = 0; i < words.length; i++) {
            let w = words[i][0];

            if (w.endsWith("_active")) w = w.replace("_active", "");
            if (w.endsWith("_text")) w = w.replace("_text", "");
            else w = null;

            words[i] = w;
        }
    };

    createObjects = () => {
        this.objGrid = new Array(this.gridHeight);

        for (let i = 0; i < this.gridHeight; i++) {
            this.objGrid[i] = new Array(this.gridWidth);

            for (let j = 0; j < this.gridWidth; j++) {
                this.objGrid[i][j] = [];

                const name = this.logicGrid[i][j][0];
                if (name === "blank") continue;

                const obj = new this.gameObjectClass(this, j * 20, i * 20, name);
                this.objGrid[i][j].push(obj);
            }
        }
    };

    checkRules = () => {
        for (let key in this.rules) {
            if (this.rules[key].includes("you") && this.rules[key].includes("defeat")) {
                for (let i = 0; i < this.gridHeight; i++) {
                    for (let j = 0; j < this.gridWidth; j++) {
                        const objs = this.objGrid[i][j];
                        if (!objs) continue;

                        for (let obj of objs) {
                            if (obj.name === key) {
                                this.vanish.push(obj);
                            }
                        }
                    }
                }
            }
            else if (this.rules[key].includes("you") && this.rules[key].includes("win")) {
                this.win();
                return;
            }
        }
    };

    checkStates = () => {
        for (let i = 0; i < this.gridHeight; i++) {
            for (let j = 0; j < this.gridWidth; j++) {

                if (this.logicGrid[i][j][0] === "blank") continue;

                const names = this.logicGrid[i][j];
                if (names.length < 2) continue;

                const objs = this.objGrid[i][j];
                let state = [];

                for (let name of names) {
                    if (this.rules[name] && this.rules[name].includes("defeat")) state.push("defeat");
                    else if (this.rules[name] && this.rules[name].includes("win")) state.push("win");
                    if (this.rules[name] && this.rules[name].includes("hot")) state.push("hot");
                }

                for (let obj of objs) {
                    const name = obj.name;

                    if (state.includes("hot") && this.rules[name].includes("melt")) {
                        this.vanish.push(obj);
                    }
                    else if (this.rules[name].includes("you")) {
                        if (state.includes("defeat")) {
                            this.vanish.push(obj);
                            continue;
                        }
                        else if (state.includes("win")) {
                            this.win();
                            return;
                        }
                    }
                }
            }
        }
    };

    win = () => {
        console.log("you win");
    };


    vanishObj = () => {
        for (let obj of this.vanish) {
            const r = Math.floor(obj.y / 20);
            const c = Math.floor(obj.x / 20);

            const nameIdx = this.logicGrid[r][c].indexOf(obj.name);
            if (nameIdx !== -1) this.logicGrid[r][c].splice(nameIdx, 1);
            if (this.logicGrid[r][c].length === 0) this.logicGrid[r][c].push("blank");

            const objIdx = this.objGrid[r][c].indexOf(obj);
            if (objIdx !== -1) this.objGrid[r][c].splice(objIdx, 1);

            obj.vanish();
        }

        this.vanish = [];
    };


    moveObj = (query, depth) => {
        const obj = query[0];
        const c = Math.floor(obj.x / 20);
        const r = Math.floor(obj.y / 20);
        const nc = Math.floor(query[1] / 20);
        const nr = Math.floor(query[2] / 20);

        const nameIdx = this.logicGrid[r][c].indexOf(obj.name);
        if (nameIdx !== -1) this.logicGrid[r][c].splice(nameIdx, 1);
        if (this.logicGrid[r][c].length === 0) this.logicGrid[r][c].push("blank");

        const objIdx = this.objGrid[r][c].indexOf(obj);
        if (objIdx !== -1) this.objGrid[r][c].splice(objIdx, 1);

        if (this.logicGrid[nr][nc][0] === "blank") {
            this.logicGrid[nr][nc].splice(0, 1);
        }

        this.logicGrid[nr][nc].push(obj.name);
        this.objGrid[nr][nc].push(obj);

        obj.moveTo(query[1], query[2], depth);
    };
    // ===== GameObject クラスを内部クラスとして保持 =====
    gameObjectClass = class {
        constructor(scene, x, y, name) {
            this.scene = scene;
            this.x = x;
            this.y = y;
            this.name = name;

            const frame = scene.typeToAssets[name];
            this.sprite = scene.add.sprite(x, y, "tiles").setOrigin(0, 0);

            scene.anims.create({
                key: name,
                frames: scene.anims.generateFrameNumbers("tiles", {
                    start: frame[0],
                    end: frame[1]
                }),
                frameRate: 2.5,
                repeat: -1
            });

            this.sprite.play(name);
        }

        moveTo(x, y, depth) {
            this.x = x;
            this.y = y;
            this.sprite.setPosition(x, y);
            this.sprite.setDepth(depth);
        }

        vanish() {
            this.sprite.destroy();
        }
    };
    update(){
    };
}


