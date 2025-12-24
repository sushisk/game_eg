// @ts-nocheck

import mapSelect from "./mapSelect.js";
import MainGame from "./MainGame.js";

const config = {
    type: Phaser.AUTO,
    width: 600,
    height: 450,
    backgroundColor: '#222222',
    parent: 'phaser-example',
    scene: [ mapSelect, MainGame ],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

let game = new Phaser.Game(config);
