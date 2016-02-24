/*jshint -W079*/

'use strict';

// Create a global reference to the game so we can reference it.
var PixiGame = PixiGame || {};

// Used by pixi
PixiGame.stage = null;
PixiGame.renderer = null;

// Game Loop Controller
PixiGame.gameLoopController = null;

// Create a reference to the scene controller
PixiGame.sceneController = null;

// Physics
PixiGame.world = null;

PixiGame.controls = null;

PixiGame.Controller = function(Scene) {

    this._state = {
        left: false,
        right: false,
        up: false,
        fire: false
    };
    this.setupPlayerControls();
};

PixiGame.Controller.constructor = PixiGame.Controller;

PixiGame.Controller.prototype.setupPlayerControls = function() {

    // setup PC keyboard interaction
    window.addEventListener('keydown', function(e) {
        this.changeControls(e.keyCode, true);
    }.bind(this), false);

    window.addEventListener('keyup', function(e) {
        this.changeControls(e.keyCode, false);
    }.bind(this), false);
};

PixiGame.Controller.prototype.changeControls = function(code, state) {

    // console.log('key code: ' + code);
    switch (code) {
        case 37:
            this._state.left = state;
            break;
        case 39:
            this._state.right = state;
            break;
        case 38:
            this._state.up = state;
            break;
        case 32:
            this._state.fire = state;
            break;
    }
};

PixiGame.Controller.prototype.state = function() {
    return this._state;
};

PixiGame.GameLoopController = function() {
    this._isGameActive = false;
    this._fps = 60;
    this._updateInterval = null;
};

PixiGame.GameLoopController.constructor = PixiGame.GameLoopController;

PixiGame.GameLoopController.prototype.tick = function() {
    if (!this._isGameActive) {
        return;
    }

    requestAnimationFrame(this.tick.bind(this));

    // update physics
    PixiGame.sceneController.update();
    PixiGame.world.step(1 / this._fps);

    // render
    PixiGame.renderer.render(PixiGame.stage);
};

PixiGame.GameLoopController.prototype.start = function() {
    if (this._isGameActive) {
        return;
    }

    this._isGameActive = true;

    // Create the game loop
    // this._updateInterval = setInterval(function() {
    this.tick();
    // }.bind(this), 1000 / this._fps);

};

PixiGame.GameLoopController.prototype.pause = function() {
    if (!this._isGameActive) {
        return;
    }

    clearInterval(this._updateInterval);
    this._isGameActive = false;
};

Object.defineProperty(PixiGame.GameLoopController.prototype, 'isPaused', {
    get: function() {
        return !this._isGameActive;
    },
});

PixiGame.SceneController = function(Scene) {

    this._currentScene = new Scene();
    this._previousScene = null;

    PixiGame.stage.addChild(this._currentScene);
};

PixiGame.SceneController.constructor = PixiGame.SceneController;

PixiGame.SceneController.prototype.update = function() {
    this._currentScene.update();
};

PixiGame.SceneController.prototype.requestSceneChange = function(Scene) {

    if (this._currentScene !== null) {
        this._previousScene = this._currentScene;
        this._previousScene.destroy();
        PixiGame.stage.removeChild(this._previousScene);
    }

    this._currentScene = new Scene();
    PixiGame.stage.addChild(this._currentScene);
};

PixiGame.MainMenuScene = function() {
    PIXI.Graphics.call(this);

    this._playButton = null;
    this.setup();
};

PixiGame.MainMenuScene.constructor = PixiGame.MainMenuScene;
PixiGame.MainMenuScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.MainMenuScene.prototype.setup = function() {
    this._playButton = new PIXI.Sprite.fromImage('images/game/play-game-btn.png');
    this._playButton.anchor = new PIXI.Point(0.5, 0.5);
    this._playButton.position.x = PixiGame.width / 2;
    this._playButton.position.y = PixiGame.height / 2;
    this._playButton.interactive = true;
    this._playButton.touchstart = this._playButton.mousedown = this.handlePlayButtonPressed.bind(this);
    console.log('this: ' + this);
    this.addChild(this._playButton);
};

PixiGame.MainMenuScene.prototype.handlePlayButtonPressed = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.GameScene);
};

PixiGame.MainMenuScene.prototype.update = function() {};

PixiGame.MainMenuScene.prototype.destroy = function() {
    this.removeChildren();
    this._playButton = null;
};

PixiGame.GameScene = function() {
    PIXI.Graphics.call(this);

    this._player = {
        body: null,
        shape: null,
        graphics: null,
        size: 50,
        speed: 100,
        turnSpeed: 2,
        bullets: {
            collection: [],
            speed: 50,
            max: 1,
            size: 5
        }
    };

    this._enemies = {
        collection: [],
        speed: 75,
        size: 50,
        amount: 0,
        max: 20
    };

    this.setup();
};

PixiGame.GameScene.constructor = PixiGame.GameScene;
PixiGame.GameScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.GameScene.prototype.setup = function() {
    this.setupPlayer();
    this.setupEnemies();
};

PixiGame.GameScene.prototype.playerFire = function() {
    var magnitude = this._player.speed * 1.5,
        angle = this._player.body.angle - Math.PI / 2;

    var bullet = {
        graphics: new PIXI.Graphics(),
        body: new p2.Body({
            mass: 0,
            damping: 0,
            angularDamping: 0
        }),
        active: false
    };

    // adjust physics
    bullet.body.velocity[0] += magnitude * Math.cos(angle) + this._player.body.velocity[0];
    bullet.body.velocity[1] += magnitude * Math.sin(angle) + this._player.body.velocity[1];
    bullet.body.position[0] = (this._player.size / 2) * Math.cos(angle) + this._player.body.position[0];
    bullet.body.position[1] = (this._player.size / 2) * Math.sin(angle) + this._player.body.position[1];

    // Create bullet shape
    var bulletShape = new p2.Circle({
        radius: this._player.bullets.size
    });
    // bulletShape.collisionGroup = BULLET;
    // bulletShape.collisionMask = ASTEROID;
    bullet.body.addShape(bulletShape);
    PixiGame.world.addBody(bullet.body);

    // Keep track of the last time we shot
    // lastShootTime = world.time;

    // Remember when we should delete this bullet
    // bulletBody.dieTime = world.time + bulletLifeTime;

    //graphics
    bullet.graphics.beginFill(0xFFFFFF);
    bullet.graphics.lineStyle(1, 0xFF0000);
    bullet.graphics.drawRect(0, 0, this._player.bullets.size, this._player.bullets.size);
    bullet.graphics.drawCircle(0, 0, this._player.bullets.size);
    bullet.graphics.endFill();
    this.addChild(bullet.graphics);

    this._player.bullets.collection.push(bullet);
};

PixiGame.GameScene.prototype.setupEnemies = function() {
    var enemies = this._enemies;

    // for (var i = 0; i < enemies.max; i++) {
    var enemyTimer = setInterval(function() {
        var x = Math.round(Math.random() * PixiGame.width);
        var y = Math.round(Math.random() * PixiGame.height);
        var vx = (Math.random() - 0.5) * enemies.speed;
        var vy = (Math.random() - 0.5) * enemies.speed;
        var va = (Math.random() - 0.5) * enemies.speed;

        var enemy = {
            body: new p2.Body({
                position: [x, y],
                mass: 0.1,
                damping: 0,
                angularDamping: 0,
                velocity: [vx, vy],
                angularVelocity: va
            }),
            graphicsContainer: new PIXI.Container()
        };

        var enemyShape = new p2.Circle({
            radius: enemies.size
        });
        enemy.body.addShape(enemyShape);
        PixiGame.world.addBody(enemy.body);

        var enemyGraphics = new PIXI.Graphics();
        enemyGraphics.beginFill(0x7AE68A);
        enemyGraphics.drawCircle(0, 0, enemies.size);
        enemyGraphics.endFill();
        enemy.graphicsContainer.addChild(enemyGraphics);
        this.addChild(enemy.graphicsContainer);

        enemies.collection.push(enemy);
    }.bind(this), 1000);
    // }
};

PixiGame.GameScene.prototype.setupPlayerBullets = function() {

    var player = this._player;
    var bullets = this._player.bullets;
    var x = 300,
        y = 300;
    // var x = this._player.body.position[0];
    // var y = this._player.body.position[1];

    // create bullets
    for (var i = 0; i < bullets.max; i++) {

        //bodies
        bullets.bodies[i] = new p2.Body({
            mass: 1,
            angularVelocity: 0,
            damping: 0,
            angularDamping: 0,
            position: [x, y]
        });

        //shapes
        bullets.shapes[i] = new p2.Box({
            width: bullets.size,
            height: bullets.size
        });
        bullets.bodies[i].addShape(bullets.shapes[i]);
        PixiGame.world.addBody(bullets.bodies[i]);

        //graphics
        bullets.graphics[i] = new PIXI.Graphics();
        bullets.graphics[i].beginFill(0xFFFFFF);
        bullets.graphics[i].lineStyle(5, 0xFF0000);
        bullets.graphics[i].drawRect(x, y, bullets.size, bullets.size);
        bullets.graphics[i].endFill();

        this.addChild(bullets.graphics[i]);
    }
};

PixiGame.GameScene.prototype.setupPlayer = function() {

    var player = this._player;

    // create player body
    player.body = new p2.Body({
        mass: 1,
        angularVelocity: 0,
        damping: 0,
        angularDamping: 0,
        position: [PixiGame.width / 2, PixiGame.height / 2]
    });

    player.shape = new p2.Box({
        width: player.size,
        height: player.size
    });
    player.body.addShape(player.shape);
    PixiGame.world.addBody(player.body);

    //draw player
    player.graphics = new PIXI.Container();

    var shipHull = new PIXI.Graphics();
    shipHull.beginFill(0xBAC6D6);
    // player.graphics.lineStyle(5, 0xFF0000);
    shipHull.moveTo(0, player.size);
    shipHull.lineTo(0, player.size * (2 / 3));
    shipHull.lineTo(player.size / 2, 0);
    shipHull.lineTo(player.size, player.size * (2 / 3));
    shipHull.lineTo(player.size, player.size);
    shipHull.lineTo(player.size * (2 / 3), player.size * (2 / 3));
    shipHull.lineTo(player.size * (1 / 3), player.size * (2 / 3));
    shipHull.endFill();

    player.graphics.addChildAt(shipHull, 0);

    var shipEngine = new PIXI.Graphics();
    shipEngine.beginFill(0xF7ED60);
    // player.graphics.lineStyle(5, 0xFF0000);
    shipEngine.moveTo(player.size * (1 / 3), player.size * (2 / 3));
    shipEngine.lineTo(player.size * (2 / 3), player.size * (2 / 3));
    shipEngine.lineTo(player.size * (1 / 2), player.size);
    shipEngine.endFill();
    shipEngine.alpha = 0;

    player.graphics.addChildAt(shipEngine, 1);

    var playerShield = new PIXI.Graphics();
    playerShield.beginFill(0xF7ED60);
    playerShield.drawCircle(player.size / 2, player.size / 2, player.size);
    playerShield.endFill();
    playerShield.alpha = 0.1;

    player.graphics.addChildAt(playerShield, 2);

    var hitShield = new PIXI.Graphics();
    hitShield.beginFill(0xCF4061);
    hitShield.drawCircle(player.size / 2, player.size / 2, player.size);
    hitShield.endFill();
    hitShield.alpha = 0.0;

    player.graphics.addChildAt(hitShield, 3);

    player.graphics.pivot.x = player.size / 2;
    player.graphics.pivot.y = player.size / 2;
    this.addChild(player.graphics);
};

PixiGame.GameScene.prototype.update = function() {

    var player = this._player;
    var enemies = this._enemies.collection;
    var controls = PixiGame.controls.state();
    var playerEngine = player.graphics.getChildAt(1);
    var bullets = player.bullets.collection;

    //player fire
    if (controls.fire) {
        //todo maintain a counter to control fire rate
        this.playerFire();
    }

    // move bullets
    for (var j = 0; j < bullets.length; j++) {
        var bullet = bullets[j];
        bullet.graphics.x = bullet.body.position[0];
        bullet.graphics.y = bullet.body.position[1];
    }

    // move enemies
    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];

        // move towards player
        var dx = Math.abs(enemy.body.position[0] - player.body.position[0]);
        var dy = Math.abs(enemy.body.position[1] - player.body.position[1]);
        var playerAngle = Math.atan(dy / dx);

        var enemyAngle = playerAngle + Math.PI / 2;
        // enemy.body.force[0] = this._enemies.speed * Math.cos(enemyAngle);
        // enemy.body.force[1] = this._enemies.speed * Math.sin(enemyAngle);

        enemy.graphicsContainer.x = enemy.body.position[0];
        enemy.graphicsContainer.y = enemy.body.position[1];
    }

    // player angles
    if (controls.left) {
        player.body.angularVelocity = -1 * player.turnSpeed;
    } else if (controls.right) {
        player.body.angularVelocity = player.turnSpeed;
    } else {
        player.body.angularVelocity = 0;
    }

    // veloctiy
    if (controls.up) {
        var angle = player.body.angle + Math.PI / 2;
        // console.log('angle: ' + angle);
        player.body.force[0] -= player.speed * Math.cos(angle);
        player.body.force[1] -= player.speed * Math.sin(angle);
        playerEngine.alpha = 1;
    } else {
        playerEngine.alpha = 0;
    }

    // test for boundaries
    var x = player.body.position[0],
        y = player.body.position[1];
    if (x < 0) {
        player.body.position[0] = PixiGame.width;
    } else if (x > PixiGame.width) {
        player.body.position[0] = 0;
    }

    if (y < 0) {
        player.body.position[1] = PixiGame.height;
    } else if (y > PixiGame.height) {
        player.body.position[1] = 0;
    }

    //update graphics
    player.graphics.x = player.body.position[0];
    player.graphics.y = player.body.position[1];
    player.graphics.rotation = player.body.angle;

    // handle collision
    PixiGame.world.on('beginContact', function(e) {

        //player
        if (e.bodyB.id === player.body.id) {
            var hitShield = player.graphics.getChildAt(3);
            hitShield.alpha = 0.25;
        }
    }.bind(this));

    PixiGame.world.on('endContact', function(e) {

        //player
        if (e.bodyB.id === player.body.id) {
            var hitShield = player.graphics.getChildAt(3);
            hitShield.alpha = 0;
        }
    }.bind(this));
};

PixiGame.GameScene.prototype.destroy = function() {
    this.removeChildren();
};

document.addEventListener('DOMContentLoaded', function() {

    // is there a better way to find w/h? does this work on mobile?
    PixiGame.width = document.documentElement.clientWidth;
    PixiGame.height = document.documentElement.clientHeight;

    // always auto detect
    PixiGame.renderer = new PIXI.autoDetectRenderer(PixiGame.width, PixiGame.height);
    PixiGame.renderer.view.setAttribute('class', 'renderer');
    document.body.appendChild(PixiGame.renderer.view);

    // create stage
    PixiGame.stage = new PIXI.Container();

    // startup Physics
    PixiGame.world = new p2.World({
        gravity: [0, 0]
    });

    // startup Controls
    PixiGame.controls = new PixiGame.Controller();

    // load initial scene
    PixiGame.sceneController = new PixiGame.SceneController(PixiGame.MainMenuScene);

    // start game
    PixiGame.gameLoopController = new PixiGame.GameLoopController();
    PixiGame.gameLoopController.start();
});
