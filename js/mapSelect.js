export default class mapSelect extends Phaser.Scene {
    constructor(){
        super("mapSelect");
        this.initData = [
            [13,19,"./assets/tilemaps/grid1.csv"]
        ]
        this.ptr;
        this.coords = [];
    }
    preload(){
        this.load.spritesheet("mapButton", "./assets/mapButton.png", {
            frameWidth: 40,
            frameHeight: 40,
        });
        this.load.image("selector", "./assets/selector.png")
    }
    create(){
        const grid = [];
        for(let i = 0; i < 3; i++){
            grid[i] = new Array(5);
            for(let j = 0; j < 2; j++){
                grid[i][j] = this.add.sprite(i*50 + 10,j*50 + 10,"mapButton",i+j*3).setOrigin(0,0);
            }
        }
        this.coords = [0,0];
        this.ptr = this.add.image(this.coords[0]+5, this.coords[1]+5, "selector").setOrigin(0,0);
        this.input.keyboard.on("keydown", (event) => this.handleInput(event));
    }
    handleInput(event){
        var {data, startGame} = this;
        let dr = 0, dc = 0;
        switch (event.code) {
            case "KeyW":case "ArrowUp":
                dr = -1; break;
            case "KeyS": case "ArrowDown":
                dr = 1; break;
            case "KeyA": case "ArrowLeft":
                dc = -1; break;
            case "KeyD": case "ArrowRight":
                dc = 1; break;
            case "Enter":
                console.log(this.initData)
                var [h,w,url] = this.initData[this.coords[0] + this.coords[1]*3];
                startGame(h,w,url);
            default:
                return;
        }
        if(this.coords[0] + dc < 0 || 2 < this.coords[0] + dc || this.coords[1] + dr < 0 || 1 < this.coords[1] + dr) return;
        this.coords[0] += dc;
        this.coords[1] += dr;
        this.ptr.setPosition(50 * this.coords[0] + 5, 50 * this.coords[1] + 5);
    }
    startGame = (h, w, url) =>{
        this.scene.start("MainGame",{
            gridHeight : h,
            gridWidth : w,
            mapfileURL : url
        });
    } 
    update(){}
}