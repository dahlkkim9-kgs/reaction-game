// AI 对手类
class AIOpponent {
    constructor() {
        // AI 难度配置
        this.difficultyConfig = {
            easy: {
                minReaction: 700,
                maxReaction: 950,
                errorRate: 0.15 // 15% 错误率
            },
            medium: {
                minReaction: 500,
                maxReaction: 900,
                errorRate: 0.08 // 8% 错误率
            },
            hard: {
                minReaction: 300,
                maxReaction: 800,
                errorRate: 0.03 // 3% 错误率
            }
        };
    }

    // 随机选择格子
    randomCell() {
        return Math.floor(Math.random() * 9);
    }

    // AI 响应（关灯）
    aiResponse(cellIndex, difficulty) {
        const config = this.difficultyConfig[difficulty];
        const reactionTime = this.randomReactionTime(config.minReaction, config.maxReaction);

        // 检查是否出错
        const willError = Math.random() < config.errorRate;

        setTimeout(() => {
            // 只清除响应计时器，不清除游戏计时器
            if (game.responseTimer) {
                clearTimeout(game.responseTimer);
                game.responseTimer = null;
            }

            if (willError) {
                // AI 出错，点击错误的格子
                const wrongCell = this.getWrongCell(cellIndex);
                if (game.state === 'player_b_response') {
                    game.onPlayerBResponse(wrongCell);
                } else if (game.state === 'player_a_response') {
                    game.onPlayerAResponse(wrongCell);
                }
            } else {
                // AI 正确响应
                if (game.state === 'player_b_response') {
                    game.onPlayerBResponse(cellIndex);
                } else if (game.state === 'player_a_response') {
                    game.onPlayerAResponse(cellIndex);
                }
            }
        }, reactionTime);
    }

    // 获取错误的格子
    getWrongCell(correctCell) {
        let wrongCell;
        do {
            wrongCell = Math.floor(Math.random() * 9);
        } while (wrongCell === correctCell);
        return wrongCell;
    }

    // 生成随机反应时间
    randomReactionTime(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // AI 开灯（玩家 B 回合）
    aiOpenCellB() {
        const cellIndex = this.randomCell();
        ui.clearLitCells();
        // 直接调用 onPlayerAResponse，而不是 playerAResponse
        // playerAResponse 会被重写，导致逻辑问题
        // 所以我们需要手动设置状态并调用正确的处理方法
        game.state = 'player_a_response';
        game.currentCell = cellIndex;
        game.turnStartTime = Date.now();
        ui.litCell(cellIndex, 'B');
        ui.showPlayerTurn('A');
        ui.setMessage('玩家 A 请点击亮起的格子！');
        game.enableOnlyCell(cellIndex);
        // 启动玩家 A 的响应计时器（玩家 A 需要点击）
        game.startResponseTimer(() => game.timeoutResponse('A'));
    }

    // AI 开灯（玩家 A 回合）
    aiOpenCellA() {
        const cellIndex = this.randomCell();
        ui.clearLitCells();
        // 直接设置状态，避免重写的方法问题
        game.state = 'player_b_response';
        game.currentCell = cellIndex;
        game.turnStartTime = Date.now();
        ui.litCell(cellIndex, 'A');
        ui.showPlayerTurn('B');
        ui.setMessage('玩家 B 请点击亮起的格子！');
        game.enableOnlyCell(cellIndex);
        // 启动玩家 B 的响应计时器（玩家 B 需要点击）
        game.startResponseTimer(() => game.timeoutResponse('B'));
    }
}

// 创建全局 AI 实例
const ai = new AIOpponent();

// 在 DOM 加载完成后设置 AI 钩子
document.addEventListener('DOMContentLoaded', () => {
    // 保存原始方法
    const originalPlayerBResponse = game.playerBResponse.bind(game);
    const originalPlayerAResponse = game.playerAResponse.bind(game);
    const originalPlayerBTurn = game.playerBTurn.bind(game);
    const originalPlayerATurn = game.playerATurn.bind(game);

    // 重写 playerBResponse - AI 模式下不启动计时器，由 AI 响应
    game.playerBResponse = function(cellIndex) {
        this.state = 'player_b_response';
        this.currentCell = cellIndex;
        this.turnStartTime = Date.now();

        ui.litCell(cellIndex, 'A');
        ui.showPlayerTurn('B');
        ui.setMessage('玩家 B 请点击亮起的格子！');
        game.enableOnlyCell(cellIndex);

        // AI 模式下，启动 AI 响应，不启动超时计时器
        if (this.mode === 'ai' && this.localPlayerRole === 'A') {
            ai.aiResponse(cellIndex, this.aiDifficulty);
        } else {
            // 联机模式或玩家是 B，启动超时计时器
            this.startResponseTimer(() => this.timeoutResponse('B'));
        }
    };

    // 重写 playerAResponse - AI 模式下不启动计时器，由 AI 响应
    game.playerAResponse = function(cellIndex) {
        this.state = 'player_a_response';
        this.currentCell = cellIndex;
        this.turnStartTime = Date.now();

        ui.litCell(cellIndex, 'B');
        ui.showPlayerTurn('A');
        ui.setMessage('玩家 A 请点击亮起的格子！');
        game.enableOnlyCell(cellIndex);

        // AI 模式下，启动 AI 响应，不启动超时计时器
        if (this.mode === 'ai' && this.localPlayerRole === 'B') {
            ai.aiResponse(cellIndex, this.aiDifficulty);
        } else {
            // 联机模式或玩家是 A，启动超时计时器
            this.startResponseTimer(() => this.timeoutResponse('A'));
        }
    };

    // 重写 playerBTurn - AI 模式下 AI 自动开灯
    game.playerBTurn = function() {
        originalPlayerBTurn.call(this);

        // AI 模式下，如果本地玩家是 A，则 AI (玩家 B) 开灯
        if (this.mode === 'ai' && this.localPlayerRole === 'A') {
            setTimeout(() => ai.aiOpenCellB(), 1000);
        }
    };

    // 重写 playerATurn - AI 模式下 AI 自动开灯（如果玩家选择 B）
    game.playerATurn = function() {
        originalPlayerATurn.call(this);

        // AI 模式下，如果本地玩家是 B，则 AI (玩家 A) 开灯
        if (this.mode === 'ai' && this.localPlayerRole === 'B') {
            setTimeout(() => ai.aiOpenCellA(), 1000);
        }
    };
});
