// 星星脚本 —— 负责收集判定, 以及临近消失时的渐隐提示

cc.Class({
    extends: cc.Component,

    properties: {
        // 小怪兽中心与星星中心距离小于该值时, 视为收集成功
        pickRadius: 60,
    },

    // LIFE-CYCLE CALLBACKS:

    // 星星生成后由 Game 脚本调用, 传入游戏管理器
    init (game) {
        this.game = game;
        this.node.opacity = 255;
    },

    // 主角与星星的直线距离
    distanceToPlayer () {
        return this.node.position.sub(this.game.player.getPosition()).mag();
    },

    // 收集成功, 计分交给 Game 脚本处理
    collect () {
        this.game.onStarCollected(this.node);
    },

    update (dt) {
        if (!this.game || !this.game.player) { return; }

        // 每帧检查距离, 足够近就算收集
        if (this.distanceToPlayer() < this.pickRadius) {
            this.collect();
            return;
        }

        // 剩余时间越少越透明, 提醒玩家尽快收集
        var leftRatio = 1 - this.game.timer / this.game.starDuration;
        if (leftRatio < 0) { leftRatio = 0; }
        this.node.opacity = 50 + Math.floor(leftRatio * 205);
    },
});
