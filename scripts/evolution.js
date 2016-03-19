/*jshint -W079*/

'use strict';

// Create a global reference to the game so we can reference it.
var PixiGame = PixiGame || {};

var Utils = Utils || {};

// Used by pixi
PixiGame.stage = null;
PixiGame.renderer = null;

// Game Loop Controller
PixiGame.gameLoopController = null;

// Create a reference to the scene controller
PixiGame.sceneController = null;

// Physics
PixiGame.world = null;

// Controls
PixiGame.controls = null;

Utils.Colors = (function() {
    var options = function(type) {
        var color = {};
        color.background = 0xD4CCBC;

        switch (type) {
            case 'attack':
                color.font = 0xE34242;
                color.box = 0xE34242;
                break;
            case 'conversation':
                color.font = 0x4267E3;
                color.box = 0x4267E3;
                break;
            case 'menu':
                color.font = 0x000000;
                color.box = 0x000000;
                break;
            case 'trade':
                color.font = 0x3C8025;
                color.box = 0x3C8025;
                break;
            default:
                color.font = 0x000000;
                color.box = 0x000000;
        }
        return color;
    };

    var health = function(type) {
        var color = {
            max: 0xD4909F,
            actual: 0xC1D490,
            font: 0x000000,
            border: 0x000000
        };
        return color;
    };

    var hud = function(type) {
        var color = {
            background: 0xD4CCBC
        };
        return color;
    };

    var log = function(type) {
        var color = {
            background: 0xD4CCBC,
            font: 0x000000
        };
        return color;
    };

    var turn = function(type) {
        var color = {
            background: 0xD4CCBC,
            font: 0x000000
        };
        return color;
    };

    return {
        options: options,
        health: health,
        hud: hud,
        log: log,
        turn: turn
    };
})();

Utils.OptionFactory = (function() {
    // var self = this,
    // methods;

    var createOption = function(option, index, optionSizeY, optionSizeX, type) {
        var optionLineSize = 5;
        var optionContainer = new PIXI.Container();
        var colors = Utils.Colors.options;

        // box
        var optionBox = new PIXI.Graphics();
        optionBox.beginFill(colors(type).background);
        optionBox.lineStyle(optionLineSize, colors(type).box);
        optionBox.drawRect(0, 0, optionSizeX, optionSizeY - optionLineSize);
        optionBox.endFill();
        optionBox.y = optionSizeY * index;
        optionContainer.addChildAt(optionBox, 0);

        // text
        var optionText = new PIXI.Text(option.text, {
            font: 'bold 20px Arial',
            fill: colors(type).font,
            align: 'center'
        });

        optionText.x = optionSizeX / 2;
        optionText.y = (optionSizeY * index + optionLineSize) + optionSizeY / 3;
        optionText.anchor.x = 0.5;
        optionText.anchor.y = 0.5;
        optionText.wordWrap = true;
        optionText.wordWrapWidth = optionSizeX;
        optionContainer.addChildAt(optionText, 1);

        optionContainer.interactive = true;
        optionContainer.touchstart = optionContainer.mousedown = option.action;

        //extend for specific use
        optionContainer.meta = option;

        return optionContainer;
    };

    return {
        createOption: createOption
    };
})();

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

PixiGame.BaseScene = (function() {
    var base = this;
    var hudX = 0,
        hudY = 0,
        hudSizeX = 0,
        hudSizeY = 0;

    var hud = function(self) {
        hudY = PixiGame.height * (2 / 3);
        // var optionsContainer = new PIXI.Container();
        // var optionLineSize = 5;
        hudSizeX = this.sizeX = PixiGame.width;
        hudSizeY = this.sizeY = PixiGame.height / 3;
        var hudContainer = new PIXI.Container();
        var colors = Utils.Colors.hud();

        // box
        var hudBackground = new PIXI.Graphics();
        hudBackground.beginFill(colors.background);
        hudBackground.lineStyle(1, colors.background);
        hudBackground.drawRect(0, 0, this.sizeX, this.sizeY);
        hudBackground.endFill();
        hudContainer.addChildAt(hudBackground, 0);

        // this.position = [];
        console.log(hudX);
        console.log(hudY);
        hudContainer.x = hudX;
        hudContainer.y = hudY;
        hudContainer.alpha = 0.5;

        self.addChildAt(hudContainer, 0);

        return this;
    };

    //horizontal
    var menu = function(self) {
        this.sizeX = 100;
        this.sizeY = 55;
        var options = [{
            text: 'Menu',
            action: mainMenu
        }];
        var optionSizeX = this.sizeX / options.length;


        var optionsContainer = new PIXI.Container();
        for (var oi = 0; oi < options.length; oi++) {
            var option = Utils.OptionFactory.createOption(options[oi], oi, this.sizeY, this.sizeX, 'menu');
            optionsContainer.addChild(option);
        }

        // position menu
        optionsContainer.x = 0;
        optionsContainer.y = PixiGame.height - this.sizeY + 5;
        self.addChildAt(optionsContainer, 1);
        return this;
    };

    var mainMenu = function(event) {
        PixiGame.sceneController.requestSceneChange(PixiGame.MainMenuScene);
    };

    var log = function(self) {
        var colors = Utils.Colors.log();
        var logDamageText;
        var logActionText;
        var logContainer = new PIXI.Container();

        // box
        var logBox = new PIXI.Graphics();
        logBox.beginFill(colors.background);
        logBox.lineStyle(1, colors.background);
        logBox.drawRect(0, 0, PixiGame.width / 3, hudSizeY / 2);
        logBox.endFill();
        logBox.y = 0;
        logContainer.addChildAt(logBox, 0);

        this.drawDamage = function() {
            logDamageText = new PIXI.Text('', {
                font: '24px Arial',
                fill: colors.font,
                align: 'center'
            });
            logDamageText.x = 0;
            logDamageText.y = 0;
            logContainer.addChildAt(logDamageText, 1);
        }.bind(self);

        this.drawDamage();

        this.updateDamage = function(logItem) {
            logDamageText.text = logItem;
        }.bind(self);

        this.drawAction = function() {
            logActionText = new PIXI.Text('', {
                font: '24px Arial',
                fill: colors.font,
                align: 'center'
            });
            logActionText.x = 0;
            logActionText.y = 50;
            logContainer.addChildAt(logActionText, 2);
        }.bind(self);

        this.drawAction();

        this.updateAction = function(logItem) {
            logActionText.text = logItem;
        }.bind(self);

        logContainer.x = hudX;
        logContainer.y = hudY;

        self.addChild(logContainer);

        return this;
    };

    var turn = function(self) {
        var colors = Utils.Colors.turn();

        //player goes first
        self._playerTurn = true;

        var displayText = 'Turn: ';
        var turnText;
        this.draw = function() {
            turnText = new PIXI.Text(displayText + 'Player', {
                font: '24px Arial',
                fill: colors.font,
                align: 'center'
            });
            turnText.x = PixiGame.width * 2 / 3;
            turnText.y = PixiGame.height - 50;
            self.addChild(turnText);
        }.bind(self);

        this.draw();

        this.update = function(isPlayerTurn) {
            if (isPlayerTurn) {
                turnText.text = displayText + 'Player';
                self._combatContainer.active(true);
            } else {
                turnText.text = displayText + 'Enemy';
                self._combatContainer.active(false);
            }
        }.bind(self);

        return this;
    };

    return {
        menu: menu,
        log: log,
        hud: hud,
        turn: turn
    };
})();

PixiGame.MainMenuScene = function() {
    PIXI.Graphics.call(this);

    this._playButton = null;
    this.setup();
};

PixiGame.MainMenuScene.constructor = PixiGame.MainMenuScene;
PixiGame.MainMenuScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.MainMenuScene.prototype.setup = function() {

    var menuWidth = PixiGame.width / 3;
    var optionSizeY = 60;

    var welcomeText = new PIXI.Text('Evolution Game Components', {
        font: 'bold 48px Arial',
        fill: 0xFFFFFF,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: menuWidth
    });
    welcomeText.x = menuWidth;
    welcomeText.y = 10;
    this.addChild(welcomeText);

    var options = [{
        text: 'Space',
        action: this.handlePlayButtonPressed.bind(this)
    }, {
        text: 'Conversation',
        action: this.handleRPGPlayButtonPressed.bind(this)
    }, {
        text: 'Combat',
        action: this.handleCombatPlayButtonPressed.bind(this)
    }];

    var optionsContainer = new PIXI.Container();
    for (var oi = 0; oi < options.length; oi++) {
        var option = Utils.OptionFactory.createOption(options[oi], oi, optionSizeY, menuWidth, 'menu');
        optionsContainer.addChild(option);
    }

    // position menu
    optionsContainer.x = PixiGame.width / 3;
    optionsContainer.y = PixiGame.height / 3;
    this.addChild(optionsContainer);
};

PixiGame.MainMenuScene.prototype.handleRPGPlayButtonPressed = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.RPGScene);
};

PixiGame.MainMenuScene.prototype.handlePlayButtonPressed = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.GameScene);
};

PixiGame.MainMenuScene.prototype.handleCombatPlayButtonPressed = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.CombatScene);
};

PixiGame.MainMenuScene.prototype.update = function() {};

PixiGame.MainMenuScene.prototype.destroy = function() {
    this.removeChildren();
    this._playButton = null;
};

PixiGame.GameScene = function() {
    PIXI.Graphics.call(this);

    this._player = {
        score: 0,
        health: 100,
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
        max: 10
    };

    this.setup();
};

PixiGame.GameScene.constructor = PixiGame.GameScene;
PixiGame.GameScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.GameScene.prototype.setup = function() {
    this.hud().setup();
    this.setupPlayer();
    this.setupEnemies();
};

PixiGame.GameScene.prototype.hud = function() {
    var scene = this;
    var hud = {
        position: [20, 20],
        setup: function() {
            var hudContainer = new PIXI.Container();
            hudContainer.x = this.position[0];
            hudContainer.y = this.position[1];
            this.score.redraw(hudContainer);
            this.health.redraw(hudContainer);
            scene.addChildAt(hudContainer, 0);
        },
        score: {
            text: 'Score: ',
            update: function(scoreAdd) {
                scene._player.score += scoreAdd;
                scene.getChildAt(0).getChildAt(0).text = this.text + scene._player.score;
            },
            redraw: function(container) {
                var scoreText = new PIXI.Text(this.text + scene._player.score, {
                    font: '24px Arial',
                    fill: 0xff1010,
                    align: 'center',
                });
                container.addChildAt(scoreText, 0);
            }
        },
        health: {
            text: 'Health: ',
            update: function(healthAdd) {
                scene._player.health += healthAdd;
                scene.getChildAt(0).getChildAt(1).text = this.text + Math.round(scene._player.health);
            },
            redraw: function(container) {
                var healthText = new PIXI.Text(this.text + scene._player.health, {
                    font: '24px Arial',
                    fill: 0xff1010,
                    align: 'center'
                });
                healthText.y = 25;
                container.addChildAt(healthText, 1);
            }
        }
    };

    return hud;
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
        if (enemies.amount >= enemies.max) {
            return;
        }

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
            graphics: new PIXI.Container()
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
        enemy.graphics.addChild(enemyGraphics);
        this.addChild(enemy.graphics);

        enemies.collection.push(enemy);
        enemies.amount++;
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

    var warp = function(body, x, y) {
        if (x < 0) {
            body.position[0] = PixiGame.width;
        } else if (x > PixiGame.width) {
            body.position[0] = 0;
        }

        if (y < 0) {
            body.position[1] = PixiGame.height;
        } else if (y > PixiGame.height) {
            body.position[1] = 0;
        }
    };

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

        enemy.graphics.x = enemy.body.position[0];
        enemy.graphics.y = enemy.body.position[1];

        warp(enemy.body, enemy.body.position[0], enemy.body.position[1]);
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

    // warp player on boundaries
    var x = player.body.position[0],
        y = player.body.position[1];
    warp(player.body, x, y);

    //update graphics
    player.graphics.x = player.body.position[0];
    player.graphics.y = player.body.position[1];
    player.graphics.rotation = player.body.angle;

    // handle collision
    PixiGame.world.on('beginContact', function(e) {

        var containsBody = function(bodyCollection, idA, idB) {
            for (var i = 0; i < bodyCollection.length; i++) {
                if (bodyCollection[i].body.id === idA || bodyCollection[i].body.id === idB) {
                    return true;
                }
            }
            return false;
        };

        // if player involved
        if (e.bodyB.id === player.body.id || e.bodyA.id === player.body.id) {
            var hitShield = player.graphics.getChildAt(3);
            hitShield.alpha = 0.25;

            // if enemy was also involved
            if (containsBody(enemies, e.bodyA.id, e.bodyB.id)) {
                this.hud().health.update(-0.1);
            }
        }

        //enemies
        for (var z = 0; z < enemies.length; z++) {
            var enemy = enemies[z];
            // if enemy was involved
            if (e.bodyB.id === enemy.body.id || e.bodyA.id === enemy.body.id) {

                //if player bullets were also involved
                if (containsBody(player.bullets.collection, e.bodyA.id, e.bodyB.id)) {
                    enemy.graphics.alpha = 0.1;
                    // this.removeChild(enemy.graphics);
                    var hitEnemy = enemies.splice(z, 1)[0];
                    this.removeChild(hitEnemy.graphics);
                    this._enemies.amount--;
                    // this.score.update(5);
                    this.hud().score.update(5);
                }
            }
        }
    }.bind(this));

    PixiGame.world.on('endContact', function(e) {

        //player
        if (e.bodyB.id === player.body.id || e.bodyA.id === player.body.id) {
            var hitShield = player.graphics.getChildAt(3);
            hitShield.alpha = 0;
        }
    }.bind(this));

    // test game conditions
    if (player.health < 0) {
        console.log('game over');
        PixiGame.score = player.score;
        this.gameEnd();
    }
};

PixiGame.GameScene.prototype.gameEnd = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.EndGameScene);
};

PixiGame.GameScene.prototype.destroy = function() {
    this.removeChildren();
};

PixiGame.RPGScene = function() {
    PIXI.Graphics.call(this);

    this._colorMap = {
        'neutral': 0xB8D65C,
        'good': 0x5CD683,
        'evil': 0xD65C79
    };
    this.setup();
};

PixiGame.RPGScene.constructor = PixiGame.GameScene;
PixiGame.RPGScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.RPGScene.prototype.setup = function() {
    this.setupConvo();
    this.setupResponse();
};

PixiGame.RPGScene.prototype.setupResponse = function() {
    this._responseText = new PIXI.Text('adsf', {
        align: 'center' //,
            // fill: 'blue'
    });

    // responseText.style.fill = '#' + this._colorMap.good.toString(16);
    this._responseText.x = 0;
    this._responseText.y = 60;
    this.addChild(this._responseText);
};

PixiGame.RPGScene.prototype.setupConvo = function() {

    // var convo = ['How are you?', 'I am wonderful', 'Dogs are small wolves', 'Why is the sky blue?'];
    var convoX = PixiGame.width * 2 / 3;
    var convo = [{
        class: 'neutral',
        text: 'Which way to the sun?'
    }, {
        class: 'evil',
        text: 'If you tell me where the sun \nis, I won\'t kill you.'
    }, {
        class: 'good',
        text: 'Help me help you.'
    }];
    var convoContainer = new PIXI.Container();

    for (var ci = 0; ci < convo.length; ci++) {
        console.log('convo[i]: ' + convo[ci]);
        var convoOption = this.createConvoOption(convo[ci], ci);
        convoContainer.addChildAt(convoOption, ci);
    }
    convoContainer.x = convoX;
    this.addChild(convoContainer);
};

PixiGame.RPGScene.prototype.createConvoOption = function(option, index) {

    var optionSizeY = 60;
    var optionSizeX = PixiGame.width / 3;
    var optionLineSize = 5;
    var optionContainer = new PIXI.Container();

    var optionBox = new PIXI.Graphics();
    optionBox.beginFill(0xFFFFFF);
    optionBox.lineStyle(optionLineSize, this._colorMap[option.class]);
    optionBox.drawRect(0, 0, optionSizeX, optionSizeY - optionLineSize);
    optionBox.endFill();
    optionBox.y = optionSizeY * index;
    optionContainer.addChildAt(optionBox, 0);

    var optionText = new PIXI.Text(option.text, {
        font: '20px Lucia Console',
        fill: this._colorMap[option.class],
        align: 'center',
    });
    optionText.x = optionLineSize;
    optionText.y = optionSizeY * index + optionLineSize;
    optionText.wordWrap = true;
    optionText.wordWrapWidth = optionSizeX;
    optionContainer.addChildAt(optionText, 1);

    optionContainer.interactive = true;
    optionContainer.touchstart = optionContainer.mousedown = this.handleConvoOptionTouch.bind(this);

    // extend option pixi container
    optionContainer.oid = index;

    return optionContainer;
};

PixiGame.RPGScene.prototype.handleConvoOptionTouch = function(e) {
    var responses = [{
        class: 'neutral',
        text: 'I\'m reluctant, but okay.'
    }, {
        class: 'evil',
        text: 'I will kill you!'
    }, {
        class: 'good',
        text: 'Let me help you.'
    }];

    var response = responses[e.target.oid];
    this._responseText.text = response.text;
    this._responseText.style.fill = '#' + this._colorMap[response.class].toString(16);
    console.log('this._colorMap[response.class].toString(16): ' + this._colorMap[response.class].toString(16));
};

PixiGame.RPGScene.prototype.update = function() {
    //tick
    //move stuff
    //handle collisions
};

PixiGame.RPGScene.prototype.gameEnd = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.MainMenuScene);
};

PixiGame.RPGScene.prototype.destroy = function() {
    this.removeChildren();
};

PixiGame.CombatScene = function() {
    PIXI.Graphics.call(this);

    this._hud = PixiGame.BaseScene.hud(this);
    this._menu = PixiGame.BaseScene.menu(this);
    this._log = PixiGame.BaseScene.log(this);
    this._turn = PixiGame.BaseScene.turn(this);

    this._player = {
        name: 'Player',
        health: 100,
        maxHealth: 100,
    };

    this._enemy = {
        name: 'Enemy',
        health: 100,
        maxHealth: 100
    };

    this._attacks = [{
        text: 'laser 5 - 10',
        min: 5,
        max: 10,
        action: this.handleCombatOptionTouch.bind(this)
    }, {
        text: 'missile 1 - 20',
        min: 1,
        max: 20,
        action: this.handleCombatOptionTouch.bind(this)
    }, {
        text: 'sabotage 7',
        min: 7,
        max: 7,
        action: this.handleCombatOptionTouch.bind(this)
    }];

    this._combatContainer = {};

    //do this last
    this.setup();
};

PixiGame.CombatScene.constructor = PixiGame.CombatScene;
PixiGame.CombatScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.CombatScene.prototype.setup = function() {
    // this.setupTurn();
    this.setupCombat();
    this.setupAllHealth();
    // this.setupLog();
};

PixiGame.CombatScene.prototype.setupAllHealth = function() {
    // var playerHealthX = this._menu.sizeX;
    this.setupHealth(this._player, this._menu.sizeX, PixiGame.height - 50);
    this.setupHealth(this._enemy, (PixiGame.width * 2 / 3), 0);
};

PixiGame.CombatScene.prototype.setupHealth = function(agent, healthX, healthY) {
    var healthMargin = 5;
    var healthWidth = (PixiGame.width / 3);
    var healthHeight = 50;
    var healthText;
    var healthContainer = new PIXI.Container();
    var maxHealthBox = new PIXI.Graphics();
    var healthBox = new PIXI.Graphics();
    agent.healthDraw = function() {
        var colors = Utils.Colors.health();

        // draw health bucket
        maxHealthBox.beginFill(colors.max);
        maxHealthBox.lineStyle(healthMargin, colors.border);
        maxHealthBox.drawRect(0, 0, healthWidth, healthHeight);
        maxHealthBox.endFill();
        healthContainer.addChildAt(maxHealthBox, 0);

        // actual health
        healthBox.beginFill(colors.actual);
        healthBox.lineStyle(healthMargin, colors.border);
        healthBox.drawRect(0, 0, healthWidth, healthHeight);
        healthBox.endFill();
        healthContainer.addChildAt(healthBox, 1);

        healthText = new PIXI.Text('' + agent.name, {
            font: '24px Arial',
            fill: colors.font,
            align: 'center',
            wordWrap: true,
            wordWrapWidth: healthWidth
        });

        healthText.x = 5;
        healthText.y = healthHeight / 3;
        // healthText.y = 0;

        healthContainer.addChildAt(healthText, 2);
        healthContainer.x = healthX;
        healthContainer.y = healthY;
        this.addChild(healthContainer);
    }.bind(this);

    // console.log('agent: ' + agent);
    agent.healthDraw();

    agent.updateHealth = function(damage) {

        //damage
        agent.health -= damage;
        // console.log(agent.name + ' health: ' + agent.health);

        //update display
        if (agent.health >= 0) {
            healthBox.width = agent.health / agent.maxHealth * healthWidth;
        } else {
            healthBox.width = 0;
        }
        this._log.updateDamage(agent.name + ' damaged for ' + damage + '!!');

    }.bind(this);
};

PixiGame.CombatScene.prototype.setupCombat = function() {

    var combatX = PixiGame.width * 2 / 3;
    var combatContainer = new PIXI.Container();
    var optionSizeY = 60;
    var optionSizeX = PixiGame.width / 3;

    for (var ci = 0; ci < this._attacks.length; ci++) {
        // var combatOption = this.createCombatOption(this._attacks[ci], ci);
        var combatOption = Utils.OptionFactory.createOption(this._attacks[ci], ci, optionSizeY, optionSizeX, 'attack');
        combatContainer.addChildAt(combatOption, ci);
    }
    combatContainer.x = PixiGame.width * 2 / 3;
    combatContainer.y = PixiGame.height * 2 / 3;
    // combatContainer.y = 50;
    this.addChild(combatContainer);

    combatContainer.turnActive = this._playerTurn;

    combatContainer.active = function(active) {
        var children = combatContainer.children;
        if (active) {
            combatContainer.interactive = true;
            combatContainer.alpha = 1;
            for (var cj = 0; cj < children.length; cj++) {
                children[cj].interactive = true;
            }
        } else {
            combatContainer.interactive = false;
            combatContainer.alpha = 0.5;
            for (var ck = 0; ck < children.length; ck++) {
                children[ck].interactive = false;
            }
        }
    };
    this._combatContainer = combatContainer;
};

PixiGame.CombatScene.prototype.handleCombatOptionTouch = function(e) {
    var min = e.target.meta.min;
    var max = e.target.meta.max;
    var damage = Math.floor(Math.random() * (max - min + 1)) + min;
    this._log.updateAction('player performs ' + e.target.meta.text);
    this._enemy.updateHealth(damage);
    this._turn.update(false);
    this.enemyTurn();
};

PixiGame.CombatScene.prototype.enemyTurn = function(e) {
    var enemyTurnTime = 500;

    var attackMin = 1,
        attackMax = this._attacks.length;
    var attackIndex = Math.floor(Math.random() * (attackMax - attackMin + 1)) + attackMin;
    var attack = this._attacks[attackIndex - 1];
    var min = attack.min,
        max = attack.max;
    var damage = Math.floor(Math.random() * (max - min + 1)) + min;

    window.setTimeout(function() {
        this._player.updateHealth(damage);
        this._log.updateAction('enemy performs ' + attack.text);
        this._turn.update(true);
        // console.log('enemy turn over');
    }.bind(this), enemyTurnTime);
};

PixiGame.CombatScene.prototype.update = function() {

    // lose conditions
    if (this._player.health <= 0) {
        // console.log('ya lose brah');
    }
};

PixiGame.CombatScene.prototype.gameEnd = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.MainMenuScene);
};

PixiGame.CombatScene.prototype.destroy = function() {
    this.removeChildren();
};

PixiGame.EndGameScene = function() {
    PIXI.Graphics.call(this);

    this._playButton = null;
    this.setup();
};

PixiGame.EndGameScene.constructor = PixiGame.EndGameScene;
PixiGame.EndGameScene.prototype = Object.create(PIXI.Graphics.prototype);

PixiGame.EndGameScene.prototype.setup = function() {
    this._playButton = new PIXI.Sprite.fromImage('images/game/play-game-btn.png');
    this._playButton.anchor = new PIXI.Point(0.5, 0.5);
    this._playButton.position.x = PixiGame.width / 2;
    this._playButton.position.y = PixiGame.height / 2;
    this._playButton.interactive = true;
    this._playButton.touchstart = this._playButton.mousedown = this.handlePlayButtonPressed.bind(this);
    console.log('this: ' + this);
    this.addChild(this._playButton);

    // display previous player score
    var scoreText = new PIXI.Text('Current Score: ' + PixiGame.score, {
        font: '24px Arial',
        fill: 0xff1010,
        align: 'center',
    });
    scoreText.x = PixiGame.width / 2 - 30;
    scoreText.y = PixiGame.height / 2 - 100;
    this.addChildAt(scoreText, 0);

    // high score
    if (PixiGame.score > PixiGame.highScore) {
        PixiGame.highScore = PixiGame.score;
        var newHighScoreText = new PIXI.Text('New High Score!', {
            font: '24px Arial',
            fill: 0xff1010,
            align: 'center',
        });
        newHighScoreText.x = PixiGame.width / 2 - 30;
        newHighScoreText.y = PixiGame.height / 2 - 150;
        this.addChildAt(newHighScoreText, 0);
    }


    var highScoreText = new PIXI.Text('High Score: ' + PixiGame.score, {
        font: '24px Arial',
        fill: 0xff1010,
        align: 'center',
    });
    highScoreText.x = PixiGame.width / 2 - 30;
    highScoreText.y = PixiGame.height / 2 - 200;
    this.addChildAt(highScoreText, 0);
};

PixiGame.EndGameScene.prototype.handlePlayButtonPressed = function(event) {
    PixiGame.sceneController.requestSceneChange(PixiGame.GameScene);
};

PixiGame.EndGameScene.prototype.update = function() {};

PixiGame.EndGameScene.prototype.destroy = function() {
    this.removeChildren();
    this._playButton = null;
};

document.addEventListener('DOMContentLoaded', function() {

    // Utilities first
    // Utils.optionFactory = new Utils.OptionFactory();

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

    // Game state
    PixiGame.score = 0;
    PixiGame.highScore = 0;

    // start game
    PixiGame.gameLoopController = new PixiGame.GameLoopController();
    PixiGame.gameLoopController.start();
});
