// 游戏配置
const GAME_CONFIG = {
    GAME_DURATION: 60, // 游戏时长（秒）
    RESPONSE_TIME: 1000, // 响应时间（毫秒）
    GRID_SIZE: 9 // 九宫格
};

// 游戏状态枚举
const GameState = {
    WAITING: 'waiting',
    PLAYER_A_TURN: 'player_a_turn',
    PLAYER_B_RESPONSE: 'player_b_response',
    PLAYER_B_TURN: 'player_b_turn',
    PLAYER_A_RESPONSE: 'player_a_response',
    GAME_OVER: 'game_over'
};

// 游戏模式
const GameMode = {
    AI: 'ai',
    MULTIPLAYER: 'multiplayer'
};

// 游戏类
class ReactionGame {
    constructor() {
        // 游戏状态
        this.state = GameState.WAITING;
        this.mode = GameMode.AI;
        this.aiDifficulty = 'medium';

        // 玩家信息
        this.playerA = {
            name: '玩家 A',
            score: 0,
            reactionTimes: [],
            avgReaction: 0
        };

        this.playerB = {
            name: '玩家 B',
            score: 0,
            reactionTimes: [],
            avgReaction: 0
        };

        // 当前回合
        this.currentRound = 0;
        this.currentCell = null;
        this.turnStartTime = 0;
        this.responseTimer = null;
        this.gameTimer = null;
        this.timeLeft = GAME_CONFIG.GAME_DURATION;

        // 本地玩家角色（联机模式）
        this.localPlayerRole = null; // 'A' 或 'B'

        // 网络相关
        this.roomId = null;
        this.isHost = false;

        // 绑定方法
        this.handleCellClick = this.handleCellClick.bind(this);
        this.startResponseTimer = this.startResponseTimer.bind(this);
        this.timeoutResponse = this.timeoutResponse.bind(this);
    }

    // 初始化游戏
    init(mode = GameMode.AI, difficulty = 'medium') {
        this.mode = mode;
        this.aiDifficulty = difficulty;
        // 不在这里重置数据，只设置参数
        // resetGameData 会在 startGame 中调用
        this.setupGrid();
    }

    // 重置游戏数据
    resetGameData() {
        this.state = GameState.WAITING;
        this.currentRound = 0;
        this.currentCell = null;
        this.timeLeft = GAME_CONFIG.GAME_DURATION;

        this.playerA.score = 0;
        this.playerA.reactionTimes = [];
        this.playerA.avgReaction = 0;

        this.playerB.score = 0;
        this.playerB.reactionTimes = [];
        this.playerB.avgReaction = 0;

        this.clearTimers();
    }

    // 清除所有计时器
    clearTimers() {
        if (this.responseTimer) {
            clearTimeout(this.responseTimer);
            this.responseTimer = null;
        }
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    // 设置九宫格
    setupGrid() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            cell.className = 'grid-cell';
            cell.dataset.index = index;
            cell.disabled = false;
        });
    }

    // 开始游戏
    startGame() {
        this.resetGameData();
        this.state = GameState.PLAYER_A_TURN;
        // 初始化计时器显示
        ui.updateTimer(this.timeLeft);
        this.startGameTimer();
        this.playerATurn();
    }

    // 开始游戏计时器
    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            ui.updateTimer(this.timeLeft);

            if (this.timeLeft <= 10) {
                ui.showTimerWarning();
            }

            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    // 玩家 A 回合（开灯）
    playerATurn() {
        this.state = GameState.PLAYER_A_TURN;
        this.currentRound++;

        ui.updateRound(this.currentRound);
        ui.showPlayerTurn('A');
        ui.setMessage('玩家 A 请点击一个格子开灯！');

        // 启用所有格子
        this.enableAllCells();

        // AI 模式下，如果本地玩家是 B，则 AI 控制玩家 A
        if (this.mode === GameMode.AI && this.localPlayerRole !== 'A') {
            setTimeout(() => ai.playerAAction(), 500);
        }
        // 联机模式下，等待玩家 A（主机）操作
    }

    // 玩家 B 响应（关灯）
    playerBResponse(cellIndex) {
        this.state = GameState.PLAYER_B_RESPONSE;
        this.currentCell = cellIndex;
        this.turnStartTime = Date.now();

        ui.litCell(cellIndex, 'A');
        ui.showPlayerTurn('B');
        ui.setMessage('玩家 B 请点击亮起的格子！');
        ui.enableOnlyCell(cellIndex);

        // 启动响应计时器
        this.startResponseTimer(() => this.timeoutResponse('B'));
    }

    // 启动响应计时器
    startResponseTimer(callback) {
        this.responseTimer = setTimeout(() => {
            callback();
        }, GAME_CONFIG.RESPONSE_TIME);

        // 不再显示倒计时覆盖层，改为只在消息提示中显示时间
    }

    // 响应超时
    timeoutResponse(player) {
        const winner = player === 'A' ? 'B' : 'A';
        ui.showMessage(`${player === 'A' ? '玩家 A' : '玩家 B'} 超时！`, 'error');
        this.givePoint(winner);

        // 继续下一回合
        setTimeout(() => {
            if (winner === 'A') {
                this.playerATurn();
            } else {
                this.playerBTurn();
            }
        }, 1000);
    }

    // 玩家 B 回合（开灯）
    playerBTurn() {
        this.state = GameState.PLAYER_B_TURN;
        this.currentRound++;

        ui.updateRound(this.currentRound);
        ui.showPlayerTurn('B');
        ui.setMessage('玩家 B 请点击一个格子开灯！');
        ui.clearLitCells();
        this.enableAllCells();

        // AI 模式下，如果本地玩家是 A，则 AI 控制玩家 B
        if (this.mode === GameMode.AI && this.localPlayerRole !== 'B') {
            setTimeout(() => ai.playerBAction(), 500);
        }
    }

    // 玩家 A 响应（关灯）
    playerAResponse(cellIndex) {
        this.state = GameState.PLAYER_A_RESPONSE;
        this.currentCell = cellIndex;
        this.turnStartTime = Date.now();

        ui.litCell(cellIndex, 'B');
        ui.showPlayerTurn('A');
        ui.setMessage('玩家 A 请点击亮起的格子！');
        ui.enableOnlyCell(cellIndex);

        // 启动响应计时器
        this.startResponseTimer(() => this.timeoutResponse('A'));
    }

    // 处理格子点击
    handleCellClick(cellIndex) {
        // 检查是否是玩家的回合
        if (!this.isPlayerTurn()) {
            return;
        }

        switch (this.state) {
            case GameState.PLAYER_A_TURN:
                this.onPlayerAOpenCell(cellIndex);
                break;
            case GameState.PLAYER_B_RESPONSE:
                this.onPlayerBResponse(cellIndex);
                break;
            case GameState.PLAYER_B_TURN:
                this.onPlayerBOpenCell(cellIndex);
                break;
            case GameState.PLAYER_A_RESPONSE:
                this.onPlayerAResponse(cellIndex);
                break;
        }
    }

    // 判断是否是本地玩家的回合
    isPlayerTurn() {
        if (this.mode === GameMode.AI) {
            // AI 模式下，本地玩家可以选择是 A 或 B
            if (this.localPlayerRole === 'A') {
                return this.state === GameState.PLAYER_A_TURN || this.state === GameState.PLAYER_A_RESPONSE;
            } else if (this.localPlayerRole === 'B') {
                return this.state === GameState.PLAYER_B_TURN || this.state === GameState.PLAYER_B_RESPONSE;
            }
            return true; // 默认可以操作所有
        }
        return true;
    }

    // 玩家 A 开灯
    onPlayerAOpenCell(cellIndex) {
        // 联机模式下发送消息
        if (this.mode === GameMode.MULTIPLAYER && network.isConnected()) {
            network.sendClick(cellIndex);
        }
        this.playerBResponse(cellIndex);
    }

    // 玩家 B 响应
    onPlayerBResponse(cellIndex) {
        // 只清除响应计时器，不清除游戏计时器
        if (this.responseTimer) {
            clearTimeout(this.responseTimer);
            this.responseTimer = null;
        }

        if (cellIndex !== this.currentCell) {
            // 点错了
            ui.showMessage('点错了！玩家 A 得分', 'error');
            ui.markCellMissed(cellIndex);
            this.givePoint('A');
            setTimeout(() => this.playerATurn(), 1000);
            return;
        }

        // 计算反应时间
        const reactionTime = Date.now() - this.turnStartTime;
        this.playerB.reactionTimes.push(reactionTime);
        this.playerB.avgReaction = this.calculateAverage(this.playerB.reactionTimes);

        // 联机模式下发送消息
        if (this.mode === GameMode.MULTIPLAYER && network.isConnected()) {
            network.sendResponse(cellIndex, reactionTime);
        }

        ui.showMessage(`玩家 B 反应时间: ${reactionTime}ms`, 'success');
        ui.markCellClicked(cellIndex);
        this.givePoint('B');
        ui.updatePlayerStats('B', this.playerB);

        setTimeout(() => this.playerBTurn(), 1000);
    }

    // 玩家 B 开灯
    onPlayerBOpenCell(cellIndex) {
        // 联机模式下发送消息
        if (this.mode === GameMode.MULTIPLAYER && network.isConnected()) {
            network.sendClick(cellIndex);
        }
        this.playerAResponse(cellIndex);
    }

    // 玩家 A 响应
    onPlayerAResponse(cellIndex) {
        // 只清除响应计时器，不清除游戏计时器
        if (this.responseTimer) {
            clearTimeout(this.responseTimer);
            this.responseTimer = null;
        }

        if (cellIndex !== this.currentCell) {
            // 点错了
            ui.showMessage('点错了！玩家 B 得分', 'error');
            ui.markCellMissed(cellIndex);
            this.givePoint('B');
            setTimeout(() => this.playerBTurn(), 1000);
            return;
        }

        // 计算反应时间
        const reactionTime = Date.now() - this.turnStartTime;
        this.playerA.reactionTimes.push(reactionTime);
        this.playerA.avgReaction = this.calculateAverage(this.playerA.reactionTimes);

        // 联机模式下发送消息
        if (this.mode === GameMode.MULTIPLAYER && network.isConnected()) {
            network.sendResponse(cellIndex, reactionTime);
        }

        ui.showMessage(`玩家 A 反应时间: ${reactionTime}ms`, 'success');
        ui.markCellClicked(cellIndex);
        this.givePoint('A');
        ui.updatePlayerStats('A', this.playerA);

        setTimeout(() => this.playerATurn(), 1000);
    }

    // 给玩家加分
    givePoint(player) {
        if (player === 'A') {
            this.playerA.score++;
            ui.updatePlayerStats('A', this.playerA);
        } else {
            this.playerB.score++;
            ui.updatePlayerStats('B', this.playerB);
        }
    }

    // 计算平均值
    calculateAverage(times) {
        if (times.length === 0) return 0;
        const sum = times.reduce((a, b) => a + b, 0);
        return Math.round(sum / times.length);
    }

    // 启用所有格子
    enableAllCells() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('disabled');
        });
    }

    // 只启用一个格子
    enableOnlyCell(cellIndex) {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach((cell, index) => {
            if (index === cellIndex) {
                cell.classList.remove('disabled');
            } else {
                cell.classList.add('disabled');
            }
        });
    }

    // 禁用所有格子
    disableAllCells() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.add('disabled');
        });
    }

    // 结束游戏
    endGame() {
        this.clearTimers();
        this.state = GameState.GAME_OVER;
        this.disableAllCells();

        // 保存统计数据
        stats.saveGameResult(this.playerA, this.playerB, this.mode);

        // 显示结果
        ui.showGameOver(this.playerA, this.playerB);
    }

    // 设置本地玩家角色
    setLocalPlayerRole(role) {
        this.localPlayerRole = role;
    }

    // 获取最快反应时间
    getFastestReaction() {
        const allTimes = [...this.playerA.reactionTimes, ...this.playerB.reactionTimes];
        if (allTimes.length === 0) return '--';
        return Math.min(...allTimes);
    }
}

// 创建全局游戏实例
const game = new ReactionGame();

// 添加格子点击事件监听
document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.dataset.index);
            game.handleCellClick(index);
        });
    });
});
