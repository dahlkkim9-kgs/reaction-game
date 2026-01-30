// UI 管理类
class UIManager {
    constructor() {
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            aiMenu: document.getElementById('ai-menu'),
            multiplayerMenu: document.getElementById('multiplayer-menu'),
            gameArea: document.getElementById('game-area'),
            gameOver: document.getElementById('game-over'),
            statsScreen: document.getElementById('stats-screen')
        };

        this.currentScreen = 'mainMenu';
        this.progressChart = null;
    }

    // 切换屏幕
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        this.screens[screenName].classList.remove('hidden');
        this.currentScreen = screenName;
    }

    // 显示主菜单
    showMainMenu() {
        this.showScreen('mainMenu');
    }

    // 显示 AI 菜单
    showAIMenu() {
        this.showScreen('aiMenu');
    }

    // 显示联机菜单
    showMultiplayerMenu() {
        this.showScreen('multiplayerMenu');
    }

    // 显示游戏区域
    showGameArea() {
        this.showScreen('gameArea');
    }

    // 显示游戏结束
    showGameOver(playerA, playerB) {
        this.showScreen('gameOver');

        // 设置获胜者显示
        const winnerDisplay = document.getElementById('winner-display');

        // 计算正确反应次数（不计入错误点击）
        const playerACorrectResponses = playerA.reactionTimes.length;
        const playerBCorrectResponses = playerB.reactionTimes.length;

        if (playerA.score > playerB.score) {
            winnerDisplay.textContent = '🔴 玩家 A 获胜!';
            winnerDisplay.className = 'winner-display player-a-wins';
        } else if (playerB.score > playerA.score) {
            winnerDisplay.textContent = '🔵 玩家 B 获胜!';
            winnerDisplay.className = 'winner-display player-b-wins';
        } else {
            // 得分相同，比较正确反应次数
            if (playerACorrectResponses > playerBCorrectResponses) {
                winnerDisplay.textContent = '🔴 玩家 A 获胜! (正确反应更多)';
                winnerDisplay.className = 'winner-display player-a-wins';
            } else if (playerBCorrectResponses > playerACorrectResponses) {
                winnerDisplay.textContent = '🔵 玩家 B 获胜! (正确反应更多)';
                winnerDisplay.className = 'winner-display player-b-wins';
            } else {
                winnerDisplay.textContent = '🤝 完全平局!';
                winnerDisplay.className = 'winner-display draw';
            }
        }

        // 设置最终得分
        document.getElementById('final-score-a').textContent = playerA.score;
        document.getElementById('final-score-b').textContent = playerB.score;

        // 设置统计信息
        const fastestReaction = game.getFastestReaction();
        document.getElementById('fastest-reaction').textContent = fastestReaction;
        document.getElementById('total-rounds').textContent = game.currentRound;
    }

    // 显示统计屏幕
    showStats() {
        this.showScreen('statsScreen');
        stats.loadStats();
        this.switchTab('history');
    }

    // 更新计时器
    updateTimer(timeLeft) {
        const timerDisplay = document.getElementById('game-timer');
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 10) {
            timerDisplay.parentElement.classList.add('warning');
        } else {
            timerDisplay.parentElement.classList.remove('warning');
        }
    }

    // 显示计时器警告
    showTimerWarning() {
        // 已经通过 CSS 类处理
    }

    // 更新回合数
    updateRound(round) {
        document.getElementById('round-count').textContent = round;
    }

    // 显示玩家回合
    showPlayerTurn(player) {
        const playerACard = document.getElementById('player-a-card');
        const playerBCard = document.getElementById('player-b-card');
        const playerATurn = document.getElementById('player-a-turn');
        const playerBTurn = document.getElementById('player-b-turn');

        playerACard.classList.remove('active');
        playerBCard.classList.remove('active');
        playerATurn.classList.add('hidden');
        playerBTurn.classList.add('hidden');

        if (player === 'A') {
            playerACard.classList.add('active');
            playerATurn.classList.remove('hidden');
        } else {
            playerBCard.classList.add('active');
            playerBTurn.classList.remove('hidden');
        }
    }

    // 更新玩家统计
    updatePlayerStats(player, playerData) {
        const prefix = player === 'A' ? 'player-a' : 'player-b';
        document.getElementById(`${prefix}-score`).textContent = playerData.score;
        document.getElementById(`${prefix}-avg`).textContent = playerData.avgReaction || '--';
    }

    // 设置玩家名称
    setPlayerNames(nameA, nameB) {
        document.getElementById('player-a-name').textContent = nameA;
        document.getElementById('player-b-name').textContent = nameB;
        game.playerA.name = nameA;
        game.playerB.name = nameB;
    }

    // 点亮格子
    litCell(cellIndex, player) {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('lit-a', 'lit-b', 'clicked', 'missed');
        });

        if (player === 'A') {
            cells[cellIndex].classList.add('lit-a');
        } else {
            cells[cellIndex].classList.add('lit-b');
        }
    }

    // 清除点亮的格子
    clearLitCells() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('lit-a', 'lit-b', 'clicked', 'missed');
        });
    }

    // 标记格子被点击
    markCellClicked(cellIndex) {
        const cells = document.querySelectorAll('.grid-cell');
        cells[cellIndex].classList.add('clicked');
    }

    // 标记格子错过
    markCellMissed(cellIndex) {
        const cells = document.querySelectorAll('.grid-cell');
        cells[cellIndex].classList.add('missed');
    }

    // 显示消息
    showMessage(message, type = '') {
        const messageDisplay = document.getElementById('message-display');
        messageDisplay.textContent = message;
        messageDisplay.className = 'message-display ' + type;
    }

    // 设置消息
    setMessage(message) {
        this.showMessage(message);
    }

    // 显示倒计时
    showCountdown(seconds, callback) {
        const overlay = document.getElementById('countdown-overlay');
        const numberEl = document.getElementById('countdown-number');
        overlay.classList.remove('hidden');
        numberEl.textContent = seconds;

        setTimeout(() => {
            overlay.classList.add('hidden');
            if (callback) callback();
        }, seconds * 1000);
    }

    // 显示房间信息
    showRoomInfo(roomId, status = '等待玩家加入...') {
        document.getElementById('room-info').classList.remove('hidden');
        document.getElementById('room-id-display').textContent = roomId;
        document.getElementById('room-status').textContent = status;
    }

    // 更新房间状态
    updateRoomStatus(status) {
        document.getElementById('room-status').textContent = status;
    }

    // 隐藏房间信息
    hideRoomInfo() {
        document.getElementById('room-info').classList.add('hidden');
    }

    // 切换统计标签
    switchTab(tabName) {
        // 更新标签按钮
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // 更新面板
        const panels = document.querySelectorAll('.stats-panel');
        panels.forEach(panel => panel.classList.add('hidden'));

        switch (tabName) {
            case 'history':
                document.getElementById('stats-history').classList.remove('hidden');
                break;
            case 'leaderboard':
                document.getElementById('stats-leaderboard').classList.remove('hidden');
                break;
            case 'progress':
                document.getElementById('stats-progress').classList.remove('hidden');
                this.renderProgressChart();
                break;
        }
    }

    // 渲染进步趋势图
    renderProgressChart() {
        const ctx = document.getElementById('progress-chart').getContext('2d');
        const gameHistory = stats.getGameHistory();

        if (this.progressChart) {
            this.progressChart.destroy();
        }

        const labels = gameHistory.map((game, index) => `游戏${index + 1}`);
        const avgReactionData = gameHistory.map(game => {
            const playerATimes = game.playerA.reactionTimes;
            const playerBTimes = game.playerB.reactionTimes;
            const allTimes = [...playerATimes, ...playerBTimes];
            if (allTimes.length === 0) return 0;
            return Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
        });

        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '平均反应时间 (ms)',
                    data: avgReactionData,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '反应时间 (ms)'
                        }
                    }
                }
            }
        });
    }

    // 更新历史记录列表
    updateHistoryList(gameHistory) {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        if (gameHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #7F8C8D;">暂无游戏记录</p>';
            return;
        }

        gameHistory.slice().reverse().forEach((game, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const date = new Date(game.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            const modeStr = game.mode === 'ai' ? '🤖 AI对战' : '👥 联机对战';
            const winner = game.playerA.score > game.playerB.score ? '玩家A胜' :
                          game.playerB.score > game.playerA.score ? '玩家B胜' : '平局';

            item.innerHTML = `
                <div class="history-date">${dateStr} ${modeStr}</div>
                <div class="history-details">${winner} | A:${game.playerA.score} B:${game.playerB.score}</div>
            `;

            historyList.appendChild(item);
        });
    }

    // 更新排行榜
    updateLeaderboard(gameHistory) {
        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';

        if (gameHistory.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #7F8C8D;">暂无数据</td></tr>';
            return;
        }

        // 按得分排序
        const sortedGames = gameHistory
            .map(game => ({
                ...game,
                maxScore: Math.max(game.playerA.score, game.playerB.score),
                avgReaction: this.calculateGameAvgReaction(game)
            }))
            .sort((a, b) => b.maxScore - a.maxScore)
            .slice(0, 10);

        sortedGames.forEach((game, index) => {
            const date = new Date(game.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${dateStr}</td>
                <td>${game.mode === 'ai' ? 'AI对战' : '联机'}</td>
                <td>${game.maxScore}</td>
                <td>${game.avgReaction}ms</td>
            `;
            leaderboardBody.appendChild(row);
        });
    }

    // 计算游戏平均反应时间
    calculateGameAvgReaction(game) {
        const allTimes = [...game.playerA.reactionTimes, ...game.playerB.reactionTimes];
        if (allTimes.length === 0) return '--';
        return Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
    }
}

// 创建全局 UI 实例
const ui = new UIManager();

// 全局函数（供 HTML 调用）
function showMainMenu() {
    ui.showMainMenu();
}

function startSinglePlayer() {
    ui.showAIMenu();
}

function showMultiplayerMenu() {
    ui.showMultiplayerMenu();
}

function showStats() {
    ui.showStats();
}

function startGame(mode, difficulty) {
    game.init(mode, difficulty);

    if (mode === 'ai') {
        game.setLocalPlayerRole('A');
        ui.setPlayerNames('玩家 A', 'AI');
        ui.showGameArea();
        setTimeout(() => game.startGame(), 500);
    }
}

function restartGame() {
    if (game.mode === 'ai') {
        startGame('ai', game.aiDifficulty);
    } else {
        // 联机模式重新开始
        ui.showMultiplayerMenu();
    }
}

function joinOrCreateRoom() {
    const roomInput = document.getElementById('room-input');
    const roomId = roomInput.value.trim().toUpperCase();

    if (roomId) {
        network.joinRoom(roomId);
    } else {
        network.createRoom();
    }
}

function switchTab(tabName) {
    ui.switchTab(tabName);
}

function clearStats() {
    if (confirm('确定要清除所有统计数据吗？')) {
        stats.clearAll();
        ui.showStats();
    }
}
