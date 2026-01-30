// 房间管理器
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    // 创建房间
    createRoom(hostWs) {
        const roomId = this.generateRoomId();

        const room = {
            id: roomId,
            host: hostWs.clientId,
            playerA: hostWs,
            playerB: null,
            gameStarted: false,
            createdAt: Date.now()
        };

        this.rooms.set(roomId, room);
        return room;
    }

    // 加入房间
    joinRoom(roomId, playerWs) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { success: false, message: '房间不存在' };
        }

        if (room.gameStarted) {
            return { success: false, message: '游戏已开始' };
        }

        if (room.playerB) {
            return { success: false, message: '房间已满' };
        }

        // 检查是否是房主尝试重新加入
        if (room.playerA && room.playerA.clientId === playerWs.clientId) {
            return { success: false, message: '你已经是房主' };
        }

        // 加入房间
        room.playerB = playerWs;

        return {
            success: true,
            role: 'B'
        };
    }

    // 离开房间
    leaveRoom(roomId, playerWs) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return;
        }

        // 移除玩家
        if (room.playerA && room.playerA.clientId === playerWs.clientId) {
            room.playerA = null;
        }

        if (room.playerB && room.playerB.clientId === playerWs.clientId) {
            room.playerB = null;
        }

        // 如果房间为空，删除房间
        if (!room.playerA && !room.playerB) {
            this.rooms.delete(roomId);
            console.log(`房间删除: ${roomId}`);
        }
        // 如果房主离开，玩家 B 成为新房主
        else if (!room.playerA && room.playerB) {
            room.playerA = room.playerB;
            room.playerB = null;
            room.host = room.playerA.clientId;
            console.log(`房主转移: ${roomId}`);
        }
    }

    // 获取房间
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // 获取房间列表
    getRoomList() {
        const roomList = [];
        this.rooms.forEach((room) => {
            roomList.push({
                id: room.id,
                hasPlayerA: !!room.playerA,
                hasPlayerB: !!room.playerB,
                gameStarted: room.gameStarted
            });
        });
        return roomList;
    }

    // 获取玩家总数
    getPlayerCount() {
        let count = 0;
        this.rooms.forEach((room) => {
            if (room.playerA) count++;
            if (room.playerB) count++;
        });
        return count;
    }

    // 生成房间 ID
    generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let roomId;

        do {
            roomId = '';
            for (let i = 0; i < 6; i++) {
                roomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(roomId));

        return roomId;
    }

    // 清理过期房间（超过 1 小时未活动）
    cleanupExpiredRooms() {
        const now = Date.now();
        const EXPIRY_TIME = 60 * 60 * 1000; // 1 小时

        this.rooms.forEach((room, roomId) => {
            if (now - room.createdAt > EXPIRY_TIME && !room.gameStarted) {
                this.rooms.delete(roomId);
                console.log(`清理过期房间: ${roomId}`);
            }
        });
    }

    // 获取房间状态
    getRoomStatus(roomId) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { exists: false };
        }

        return {
            exists: true,
            hasPlayerA: !!room.playerA,
            hasPlayerB: !!room.playerB,
            gameStarted: room.gameStarted,
            canStart: !room.gameStarted && room.playerA && room.playerB
        };
    }
}

// 定期清理过期房间
setInterval(() => {
    // 这个会在服务器创建 RoomManager 实例后自动清理
    if (module.exports && module.exports.roomManager) {
        module.exports.roomManager.cleanupExpiredRooms();
    }
}, 5 * 60 * 1000); // 每 5 分钟清理一次

module.exports = RoomManager;
