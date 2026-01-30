// WebSocket 服务器
const WebSocket = require('ws');
const http = require('http');
const RoomManager = require('./rooms');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 健康检查端点
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', players: RoomManager.getPlayerCount() }));
        return;
    }

    // 获取房间列表
    if (req.url === '/rooms') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(RoomManager.getRoomList()));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 房间管理器
const roomManager = new RoomManager();

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
    console.log(`新连接: ${req.socket.remoteAddress}`);

    // 为客户端分配唯一 ID
    const clientId = generateClientId();
    ws.clientId = clientId;
    ws.isAlive = true;

    // 设置心跳检测
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // 发送欢迎消息
    sendToClient(ws, {
        type: 'connected',
        clientId: clientId
    });

    // 处理客户端消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('解析消息失败:', error);
            sendToClient(ws, {
                type: 'error',
                message: '无效的消息格式'
            });
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log(`连接关闭: ${clientId}`);
        handleDisconnect(ws);
    });

    // 处理错误
    ws.on('error', (error) => {
        console.error(`WebSocket 错误: ${clientId}`, error);
    });
});

// 处理客户端消息
function handleMessage(ws, message) {
    const clientId = ws.clientId;

    switch (message.type) {
        case 'create_room':
            handleCreateRoom(ws);
            break;

        case 'join_room':
            handleJoinRoom(ws, message.roomId);
            break;

        case 'start_game':
            handleStartGame(ws);
            break;

        case 'click':
            handleClick(ws, message);
            break;

        case 'response':
            handleResponse(ws, message);
            break;

        case 'leave_room':
            handleLeaveRoom(ws);
            break;

        default:
            sendToClient(ws, {
                type: 'error',
                message: '未知的消息类型'
            });
    }
}

// 创建房间
function handleCreateRoom(ws) {
    const room = roomManager.createRoom(ws);
    ws.roomId = room.id;

    sendToClient(ws, {
        type: 'room_created',
        roomId: room.id
    });

    console.log(`房间创建: ${room.id}`);
}

// 加入房间
function handleJoinRoom(ws, roomId) {
    const result = roomManager.joinRoom(roomId, ws);

    if (result.success) {
        ws.roomId = roomId;

        sendToClient(ws, {
            type: 'room_joined',
            roomId: roomId,
            role: result.role,
            gameStarted: roomManager.getRoom(roomId).gameStarted
        });

        // 通知房间内的其他玩家
        broadcastToRoom(roomId, {
            type: 'player_joined',
            playerRole: result.role
        }, ws);

        console.log(`玩家加入房间: ${roomId} as ${result.role}`);
    } else {
        sendToClient(ws, {
            type: 'error',
            message: result.message
        });
    }
}

// 开始游戏
function handleStartGame(ws) {
    const room = roomManager.getRoom(ws.roomId);

    if (!room) {
        sendToClient(ws, {
            type: 'error',
            message: '房间不存在'
        });
        return;
    }

    // 只有房主可以开始游戏
    if (room.host !== ws.clientId) {
        sendToClient(ws, {
            type: 'error',
            message: '只有房主可以开始游戏'
        });
        return;
    }

    // 检查是否有足够的玩家
    if (!room.playerA || !room.playerB) {
        sendToClient(ws, {
            type: 'error',
            message: '等待玩家加入'
        });
        return;
    }

    // 标记游戏开始
    room.gameStarted = true;

    // 通知所有玩家游戏开始
    broadcastToRoom(room.id, {
        type: 'game_start'
    });

    console.log(`游戏开始: ${room.id}`);
}

// 处理点击事件
function handleClick(ws, message) {
    const room = roomManager.getRoom(ws.roomId);

    if (!room || !room.gameStarted) {
        return;
    }

    // 广播点击事件给对手
    broadcastToRoom(room.id, {
        type: 'opponent_click',
        cellIndex: message.cellIndex,
        timestamp: message.timestamp
    }, ws);
}

// 处理响应事件
function handleResponse(ws, message) {
    const room = roomManager.getRoom(ws.roomId);

    if (!room || !room.gameStarted) {
        return;
    }

    // 广播响应事件给对手
    broadcastToRoom(room.id, {
        type: 'opponent_response',
        cellIndex: message.cellIndex,
        reactionTime: message.reactionTime,
        timestamp: message.timestamp
    }, ws);
}

// 处理离开房间
function handleLeaveRoom(ws) {
    const roomId = ws.roomId;
    if (roomId) {
        roomManager.leaveRoom(roomId, ws);
        broadcastToRoom(roomId, {
            type: 'player_left'
        });
        ws.roomId = null;
    }
}

// 处理断开连接
function handleDisconnect(ws) {
    if (ws.roomId) {
        handleLeaveRoom(ws);
    }
}

// 发送消息给客户端
function sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// 广播消息给房间内的所有客户端
function broadcastToRoom(roomId, message, excludeWs = null) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const clients = [room.playerA, room.playerB].filter(c => c && c.readyState === WebSocket.OPEN);

    clients.forEach(client => {
        if (client !== excludeWs) {
            sendToClient(client, message);
        }
    });
}

// 生成客户端 ID
function generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 心跳检测
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// 服务器启动
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`HTTP: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭服务器...');
    clearInterval(interval);
    wss.clients.forEach(ws => ws.close());
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

module.exports = { wss, roomManager };
