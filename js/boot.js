// @ts-nocheck

import mapSelect from "./mapSelect.js";
import MainGame from "./MainGame.js";

const config = {
    type: Phaser.AUTO,
    width: 300,
    height: 200,
    backgroundColor: '#222222',
    parent: 'phaser-example',
    scene: [ mapSelect, MainGame ]
};

let game = new Phaser.Game(config);