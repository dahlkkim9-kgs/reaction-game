// 网络管理类
class NetworkManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.roomId = null;
        this.playerRole = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;

        // 默认 WebSocket 服务器地址
        this.serverUrl = this.getServerUrl();
    }

    // 获取服务器 URL
    getServerUrl() {
        // 开发环境使用 localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ws://localhost:8080';
        }
        // 生产环境使用 ngrok 地址（注意：ngrok 地址会变化）
        return 'wss://unrelative-ratty-corrin.ngrok-free.app';
    }

    // 连接服务器
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    console.log('已连接到服务器');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket 错误:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.connected = false;
                    console.log('与服务器断开连接');

                    // 尝试重连
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        setTimeout(() => {
                            console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                            this.connect().catch(() => {
                                ui.showMessage('连接失败，请刷新页面重试', 'error');
                            });
                        }, 2000);
                    } else {
                        ui.showMessage('与服务器断开连接', 'error');
                        setTimeout(() => ui.showMainMenu(), 2000);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // 处理服务器消息
    handleMessage(message) {
        console.log('收到消息:', message);

        switch (message.type) {
            case 'room_created':
                this.onRoomCreated(message.roomId);
                break;

            case 'room_joined':
                this.onRoomJoined(message);
                break;

            case 'player_joined':
                this.onPlayerJoined(message);
                break;

            case 'game_start':
                this.onGameStart(message);
                break;

            case 'opponent_click':
                this.onOpponentClick(message);
                break;

            case 'opponent_response':
                this.onOpponentResponse(message);
                break;

            case 'timeout':
                this.onTimeout(message);
                break;

            case 'player_left':
                this.onPlayerLeft(message);
                break;

            case 'error':
                this.onError(message);
                break;
        }
    }

    // 发送消息
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('未连接到服务器');
        }
    }

    // 创建房间
    async createRoom() {
        try {
            await this.connect();
            this.send({ type: 'create_room' });
        } catch (error) {
            ui.showMessage('无法连接到服务器', 'error');
        }
    }

    // 加入房间
    async joinRoom(roomId) {
        try {
            await this.connect();
            this.send({ type: 'join_room', roomId });
        } catch (error) {
            ui.showMessage('无法连接到服务器', 'error');
        }
    }

    // 发送点击事件
    sendClick(cellIndex) {
        this.send({
            type: 'click',
            cellIndex,
            timestamp: Date.now()
        });
    }

    // 发送响应事件
    sendResponse(cellIndex, reactionTime) {
        this.send({
            type: 'response',
            cellIndex,
            reactionTime,
            timestamp: Date.now()
        });
    }

    // 房间创建成功
    onRoomCreated(roomId) {
        this.roomId = roomId;
        this.playerRole = 'A';
        game.isHost = true;
        game.setLocalPlayerRole('A');

        ui.showRoomInfo(roomId, '等待玩家加入...');
        ui.showMessage(`房间已创建: ${roomId}`, 'success');
    }

    // 成功加入房间
    onRoomJoined(message) {
        this.roomId = message.roomId;
        this.playerRole = message.role;
        game.isHost = (this.playerRole === 'A');
        game.setLocalPlayerRole(this.playerRole);

        if (message.gameStarted) {
            ui.showMessage('游戏已开始', 'success');
        } else {
            ui.showRoomInfo(message.roomId, '等待房主开始游戏...');
        }
    }

    // 玩家加入
    onPlayerJoined(message) {
        ui.updateRoomStatus('玩家已加入！游戏即将开始...');

        // 更新玩家名称
        const localName = this.playerRole === 'A' ? '玩家 A (你)' : '玩家 B (你)';
        const opponentName = this.playerRole === 'A' ? '玩家 B' : '玩家 A (你)';
        ui.setPlayerNames(localName, opponentName);

        // 房主开始游戏
        if (game.isHost) {
            setTimeout(() => {
                this.send({ type: 'start_game' });
            }, 1000);
        }
    }

    // 游戏开始
    onGameStart(message) {
        game.mode = GameMode.MULTIPLAYER;
        game.init(GameMode.MULTIPLAYER);
        ui.showGameArea();
        game.startGame();
    }

    // 对手点击
    onOpponentClick(message) {
        if (this.playerRole === 'A') {
            // 对手 (B) 开灯，本地玩家需要响应
            game.playerAResponse(message.cellIndex);
        } else {
            // 对手 (A) 开灯，本地玩家需要响应
            game.playerBResponse(message.cellIndex);
        }
    }

    // 对手响应
    onOpponentResponse(message) {
        // 更新对手的反应时间统计
        const opponentPlayer = this.playerRole === 'A' ? game.playerB : game.playerA;
        opponentPlayer.reactionTimes.push(message.reactionTime);
        opponentPlayer.avgReaction = game.calculateAverage(opponentPlayer.reactionTimes);

        ui.showMessage(`对手反应时间: ${message.reactionTime}ms`, 'success');

        // 继续游戏
        setTimeout(() => {
            if (this.playerRole === 'A') {
                game.playerATurn();
            } else {
                game.playerBTurn();
            }
        }, 1000);
    }

    // 超时处理
    onTimeout(message) {
        const winner = message.winner;
        ui.showMessage(`${winner === 'A' ? '玩家 A' : '玩家 B'} 超时！`, 'error');
        game.givePoint(winner);

        setTimeout(() => {
            if (winner === 'A') {
                if (this.playerRole === 'A') {
                    game.playerATurn();
                }
            } else {
                if (this.playerRole === 'B') {
                    game.playerBTurn();
                }
            }
        }, 1000);
    }

    // 玩家离开
    onPlayerLeft(message) {
        ui.showMessage('对手已离开游戏', 'error');
        setTimeout(() => {
            ui.showMainMenu();
        }, 2000);
    }

    // 错误处理
    onError(message) {
        ui.showMessage(message.message || '发生错误', 'error');
    }

    // 断开连接
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.roomId = null;
        this.playerRole = null;
    }

    // 检查是否已连接
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // 生成房间 ID
    static generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let roomId = '';
        for (let i = 0; i < 6; i++) {
            roomId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return roomId;
    }
}

// 创建全局网络实例
const network = new NetworkManager();
