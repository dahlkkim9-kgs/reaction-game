// 统计管理类
class StatsManager {
    constructor() {
        this.storageKey = 'reactionGameStats';
        this.gameHistory = [];
        this.loadStats();
    }

    // 加载统计数据
    loadStats() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                this.gameHistory = JSON.parse(data);
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            this.gameHistory = [];
        }
    }

    // 保存统计数据
    saveStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.gameHistory));
        } catch (error) {
            console.error('保存统计数据失败:', error);
        }
    }

    // 保存游戏结果
    saveGameResult(playerA, playerB, mode) {
        const gameResult = {
            date: new Date().toISOString(),
            mode: mode,
            duration: 60, // 游戏时长（秒）
            playerA: {
                score: playerA.score,
                reactionTimes: [...playerA.reactionTimes]
            },
            playerB: {
                score: playerB.score,
                reactionTimes: [...playerB.reactionTimes]
            }
        };

        this.gameHistory.push(gameResult);
        this.saveStats();
    }

    // 获取游戏历史
    getGameHistory() {
        return this.gameHistory;
    }

    // 获取最近的 N 场游戏
    getRecentGames(count = 10) {
        return this.gameHistory.slice(-count);
    }

    // 获取最佳得分
    getBestScore(mode = null) {
        let filteredHistory = this.gameHistory;
        if (mode) {
            filteredHistory = this.gameHistory.filter(game => game.mode === mode);
        }

        if (filteredHistory.length === 0) return 0;

        return Math.max(
            ...filteredHistory.map(game => Math.max(game.playerA.score, game.playerB.score))
        );
    }

    // 获取平均反应时间
    getAverageReactionTime(mode = null) {
        let filteredHistory = this.gameHistory;
        if (mode) {
            filteredHistory = this.gameHistory.filter(game => game.mode === mode);
        }

        if (filteredHistory.length === 0) return 0;

        const allTimes = filteredHistory.flatMap(game => [
            ...game.playerA.reactionTimes,
            ...game.playerB.reactionTimes
        ]);

        if (allTimes.length === 0) return 0;

        return Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
    }

    // 获取最快反应时间
    getFastestReactionTime(mode = null) {
        let filteredHistory = this.gameHistory;
        if (mode) {
            filteredHistory = this.gameHistory.filter(game => game.mode === mode);
        }

        if (filteredHistory.length === 0) return 0;

        const allTimes = filteredHistory.flatMap(game => [
            ...game.playerA.reactionTimes,
            ...game.playerB.reactionTimes
        ]);

        if (allTimes.length === 0) return 0;

        return Math.min(...allTimes);
    }

    // 获取游戏总数
    getTotalGames(mode = null) {
        if (mode) {
            return this.gameHistory.filter(game => game.mode === mode).length;
        }
        return this.gameHistory.length;
    }

    // 获取胜率
    getWinRate(playerRole = 'A') {
        const relevantGames = this.gameHistory.filter(game => {
            if (playerRole === 'A') {
                return game.playerA.score > game.playerB.score;
            } else {
                return game.playerB.score > game.playerA.score;
            }
        });

        if (this.gameHistory.length === 0) return 0;

        // 这里简化处理，实际应该根据玩家角色统计
        const wins = relevantGames.length;
        return Math.round((wins / this.gameHistory.length) * 100);
    }

    // 获取进步趋势
    getProgressTrend() {
        if (this.gameHistory.length < 2) return null;

        const recentGames = this.gameHistory.slice(-10);
        const avgReactions = recentGames.map(game => {
            const allTimes = [
                ...game.playerA.reactionTimes,
                ...game.playerB.reactionTimes
            ];
            if (allTimes.length === 0) return 0;
            return allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
        });

        // 计算趋势（简单线性回归）
        const n = avgReactions.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = avgReactions.reduce((a, b) => a + b, 0);
        const sumXY = avgReactions.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        return {
            slope: slope,
            improving: slope < 0, // 反应时间减少是进步
            recentAvg: avgReactions[avgReactions.length - 1]
        };
    }

    // 清除所有统计数据
    clearAll() {
        this.gameHistory = [];
        this.saveStats();
    }

    // 导出统计数据
    exportStats() {
        const dataStr = JSON.stringify(this.gameHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reaction-game-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // 导入统计数据
    importStats(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.gameHistory = imported;
                this.saveStats();
                return true;
            }
            return false;
        } catch (error) {
            console.error('导入统计数据失败:', error);
            return false;
        }
    }

    // 获取统计摘要
    getSummary() {
        return {
            totalGames: this.getTotalGames(),
            aiGames: this.getTotalGames('ai'),
            multiplayerGames: this.getTotalGames('multiplayer'),
            bestScore: this.getBestScore(),
            avgReactionTime: this.getAverageReactionTime(),
            fastestReaction: this.getFastestReactionTime(),
            progressTrend: this.getProgressTrend()
        };
    }
}

// 创建全局统计实例
const stats = new StatsManager();

// 重写 UI 中的加载统计数据方法，确保在显示时正确更新
const originalShowStats = ui.showStats.bind(ui);
ui.showStats = function() {
    originalShowStats();

    const gameHistory = stats.getGameHistory();
    this.updateHistoryList(gameHistory);
    this.updateLeaderboard(gameHistory);
};
