export default class UIscene extends Phaser.Scene {
    constructor(){
        super("UIScene");
    }
    preload(){
        this.load.spritesheet("UIs", "./assets/UIs.png", {
            frameWidth: 30,
            frameHeight: 30,
        });
    }
    init(data){
        this.s = this.scene.get(data.sceneName);
    }
    create(){
        const up = this.add.sprite(30,390,"UIs",0).setOrigin(0,0).setInteractive();
        up.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyW' });
        });
        const down = this.add.sprite(30,420,"UIs",1).setOrigin(0,0).setInteractive();
        down.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyS' });
        });
        const left = this.add.sprite(0,420,"UIs",2).setOrigin(0,0).setInteractive();
        left.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyA' });
        });
        const right = this.add.sprite(60,420,"UIs",3).setOrigin(0,0).setInteractive();
        right.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyD' });
        });
        const undo = this.add.sprite(510,420,"UIs",4).setOrigin(0,0).setInteractive();
        undo.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyU' });
        });
        const restart = this.add.sprite(540,420,"UIs",5).setOrigin(0,0).setInteractive();
        restart.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'KeyR' });
        });
        const enter = this.add.sprite(570,420,"UIs",6).setOrigin(0,0).setInteractive();
        enter.on('pointerdown',() =>{
            this.s.input.keyboard.emit('keydown', { code : 'Enter' });
        });
    }
}