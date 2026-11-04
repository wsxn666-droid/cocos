// 游戏管理器 —— 挂在 Canvas 上, 负责开始与结束流程、计分、星星的生成与回收

cc.Class({
    extends: cc.Component,

    properties: {
        // 星星预制资源
        starPrefab: {
            default: null,
            type: cc.Prefab
        },
        // 星星存在的最短 / 最长时间(秒), 每颗星星在两者之间随机
        maxStarDuration: 5,
        minStarDuration: 3,
        // 地面节点, 用于计算星星出现的最低高度
        ground: {
            default: null,
            type: cc.Node
        },
        // 小怪兽节点
        player: {
            default: null,
            type: cc.Node
        },
        // 分数文字与游戏结束文字
        scoreDisplay: {
            default: null,
            type: cc.Label
        },
        gameOverDisplay: {
            default: null,
            type: cc.Label
        },
        // 开始按钮节点
        startButtonNode: {
            default: null,
            type: cc.Node
        },
        // 收集星星 / 游戏结束时播放的音效
        scoreAudio: {
            default: null,
            type: cc.AudioClip
        },
        gameOverAudio: {
            default: null,
            type: cc.AudioClip
        },
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.score = 0;
        this.timer = 0;
        this.starDuration = 0;
        this.star = null;

        // 地面顶端的 y 坐标, 星星最低也要出现在这个高度之上
        this.groundTop = this.ground.y + this.ground.height * this.ground.scaleY / 2;

        // 对象池: 回收星星消失动画节点, 避免反复创建销毁
        this.fxPool = new cc.NodePool();

        // 初始界面: 只显示开始按钮和初始分数
        this.gameOverDisplay.node.active = false;
        this.scoreDisplay.string = 'Score: 0';
        // 点击开始按钮之后游戏逻辑才开始运行
        this.enabled = false;
    },

    // 开始按钮的点击事件
    onStartButtonClick () {
        this.startButtonNode.active = false;
        this.gameOverDisplay.node.active = false;

        // 分数清零
        this.score = 0;
        this.scoreDisplay.string = 'Score: 0';

        // 初始化小怪兽: 回到初始位置并开始跳跃
        var playerComp = this.player.getComponent('player');
        playerComp.enabled = true;
        playerComp.restart();

        // 第一颗星星
        this.timer = 0;
        this.starDuration = this.randomDuration();
        this.spawnStar();

        // 游戏正式开始
        this.enabled = true;
    },

    // 每颗星星的存在时间在 min 与 max 之间随机
    randomDuration () {
        return this.minStarDuration + Math.random() * (this.maxStarDuration - this.minStarDuration);
    },

    // 生成一颗新星星
    spawnStar () {
        var newStar = cc.instantiate(this.starPrefab);
        this.node.addChild(newStar);
        newStar.setPosition(this.randomStarPos());
        newStar.getComponent('star').init(this);
        this.star = newStar;
    },

    // 随机星星位置: 横向在屏幕内随机, 纵向在地面之上、一跳可及的范围内
    randomStarPos () {
        var halfWidth = this.node.width / 2 - 60;
        var randX = (Math.random() - 0.5) * 2 * halfWidth;
        var jumpHeight = this.player.getComponent('player').jumpHeight;
        var randY = this.groundTop + Math.random() * jumpHeight + 50;
        return cc.v2(randX, randY);
    },

    update (dt) {
        // 当前星星超过存在时间仍未被收集, 游戏失败
        if (this.timer > this.starDuration) {
            this.gameOver();
            return;
        }
        this.timer += dt;
    },

    // 星星被收集: 加分, 播放动画与音效, 再生成下一颗
    onStarCollected (starNode) {
        this.score += 1;
        this.scoreDisplay.string = 'Score: ' + this.score;
        this.bumpScore();
        if (this.scoreAudio) {
            cc.audioEngine.playEffect(this.scoreAudio, false);
        }
        this.playPopFx(starNode.getPosition(), this.grabSpriteFrame(starNode));
        starNode.destroy();

        this.timer = 0;
        this.starDuration = this.randomDuration();
        this.spawnStar();
    },

    // 分数变化时让数字弹一下
    bumpScore () {
        this.scoreDisplay.node.stopAllActions();
        this.scoreDisplay.node.setScale(1.4);
        this.scoreDisplay.node.runAction(cc.scaleTo(0.12, 1, 1));
    },

    // 从即将销毁的星星上取出图片, 供消失动画使用
    grabSpriteFrame (starNode) {
        var sprite = starNode.getComponent(cc.Sprite);
        return sprite ? sprite.spriteFrame : null;
    },

    // 星星消失动画: 一张同样的星星图片放大并淡出, 播完放回对象池
    playPopFx (pos, spriteFrame) {
        if (!spriteFrame) { return; }

        var fxNode = this.fxPool.size() > 0 ? this.fxPool.get() : null;
        if (!fxNode) {
            fxNode = new cc.Node('starPopFx');
            fxNode.addComponent(cc.Sprite);
        }
        fxNode.setParent(this.node);
        fxNode.setPosition(pos);
        fxNode.opacity = 255;
        fxNode.setScale(1, 1);
        fxNode.getComponent(cc.Sprite).spriteFrame = spriteFrame;

        var pool = this.fxPool;
        var recycle = cc.callFunc(function () {
            pool.put(fxNode);
        });
        fxNode.runAction(cc.sequence(
            cc.spawn(
                cc.scaleTo(0.3, 1.8, 1.8),
                cc.fadeOut(0.3)
            ),
            recycle
        ));
    },

    // 游戏结束: 停止一切, 展示得分并回到开始界面
    gameOver () {
        this.enabled = false;

        var playerComp = this.player.getComponent('player');
        playerComp.enabled = false;
        playerComp.freeze();

        // 移除尚未被收集的星星
        if (this.star && cc.isValid(this.star)) {
            this.star.destroy();
        }
        this.star = null;

        if (this.gameOverAudio) {
            cc.audioEngine.playEffect(this.gameOverAudio, false);
        }

        this.gameOverDisplay.string = '游戏结束! 得分: ' + this.score;
        this.gameOverDisplay.node.active = true;

        this.startButtonNode.active = true;
    },
});
