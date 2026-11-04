// 小怪兽脚本 —— 控制主角的持续跳跃、左右移动与移动范围
// 操作方式: 键盘 A / D 或 方向键 ← / →, 也可以按住屏幕左、右半侧拖动

cc.Class({
    extends: cc.Component,

    properties: {
        // 起跳能达到的最大高度(像素)
        jumpHeight: 200,
        // 完成一次起跳(或下落)所需的时间(秒)
        jumpDuration: 0.3,
        // 水平移动的速度上限(像素/秒)
        maxMoveSpeed: 400,
        // 按住方向键时水平速度的加速度
        accel: 1000,
        // 跳跃落地时播放的音效, 在属性检查器中拖入音频资源
        jumpAudio: {
            default: null,
            type: cc.AudioClip
        },
    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        // 当前水平速度与左右两个方向的按键状态
        this.curSpeed = 0;
        this.pressLeft = false;
        this.pressRight = false;

        // 记录小怪兽的初始位置, 重新开始时回到这里
        this.homeX = this.node.x;
        this.homeY = this.node.y;

        // 键盘输入
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);

        // 触摸输入挂在使用者所在的画布上
        var canvas = this.node.parent;
        if (canvas) {
            canvas.on(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
            canvas.on(cc.Node.EventType.TOUCH_END, this.onTouchFinished, this);
            canvas.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchFinished, this);
        }
    },

    onDestroy () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        var canvas = this.node.parent;
        if (canvas) {
            canvas.off(cc.Node.EventType.TOUCH_START, this.onTouchBegan, this);
            canvas.off(cc.Node.EventType.TOUCH_END, this.onTouchFinished, this);
            canvas.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchFinished, this);
        }
    },

    // 组合一个 "起跳 -> 下落 -> 落地音效" 的循环动作
    createJumpAction () {
        var jumpUp = cc.moveBy(this.jumpDuration, cc.v2(0, this.jumpHeight)).easing(cc.easeSineOut());
        var jumpDown = cc.moveBy(this.jumpDuration, cc.v2(0, -this.jumpHeight)).easing(cc.easeSineIn());
        var onLand = cc.callFunc(this.playJumpFx, this);
        return cc.repeatForever(cc.sequence(jumpUp, jumpDown, onLand));
    },

    playJumpFx () {
        if (this.jumpAudio) {
            cc.audioEngine.playEffect(this.jumpAudio, false);
        }
    },

    // 游戏开始(或重新开始)时由 Game 脚本调用
    restart () {
        this.node.stopAllActions();
        // 若组件尚未走过 onLoad, 就地补记初始位置
        if (this.homeX === undefined) {
            this.homeX = this.node.x;
            this.homeY = this.node.y;
        }
        this.node.setPosition(this.homeX, this.homeY);
        this.curSpeed = 0;
        this.pressLeft = false;
        this.pressRight = false;
        this.node.runAction(this.createJumpAction());
    },

    // 游戏结束时由 Game 脚本调用: 停止跳跃与移动
    freeze () {
        this.node.stopAllActions();
        this.curSpeed = 0;
        this.pressLeft = false;
        this.pressRight = false;
    },

    // 把按键状态转换成方向
    setDir (keyCode, pressed) {
        if (keyCode === cc.macro.KEY.a || keyCode === cc.macro.KEY.left) {
            this.pressLeft = pressed;
        } else if (keyCode === cc.macro.KEY.d || keyCode === cc.macro.KEY.right) {
            this.pressRight = pressed;
        }
    },

    onKeyDown (event) {
        this.setDir(event.keyCode, true);
    },

    onKeyUp (event) {
        this.setDir(event.keyCode, false);
    },

    // 触摸点落在屏幕左半边就往左移动, 右半边则往右
    onTouchBegan (event) {
        if (!this.enabled) { return; }
        var localX = this.node.parent.convertToNodeSpaceAR(event.getLocation()).x;
        this.pressLeft = localX < 0;
        this.pressRight = !this.pressLeft;
    },

    onTouchFinished () {
        this.pressLeft = false;
        this.pressRight = false;
    },

    update (dt) {
        // 按住的方向决定加速度方向
        if (this.pressLeft) {
            this.curSpeed -= this.accel * dt;
        } else if (this.pressRight) {
            this.curSpeed += this.accel * dt;
        }
        // 限制水平速度不超过上限
        if (Math.abs(this.curSpeed) > this.maxMoveSpeed) {
            this.curSpeed = this.maxMoveSpeed * (this.curSpeed > 0 ? 1 : -1);
        }
        // 按当前速度移动
        this.node.x += this.curSpeed * dt;

        // 不允许跑出屏幕两侧
        var limit = cc.winSize.width / 2 - this.node.width / 2;
        if (this.node.x > limit) {
            this.node.x = limit;
            this.curSpeed = 0;
        } else if (this.node.x < -limit) {
            this.node.x = -limit;
            this.curSpeed = 0;
        }
    },
});
