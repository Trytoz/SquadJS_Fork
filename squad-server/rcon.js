import Logger from 'core/logger';
import Rcon from 'core/rcon';
import {iterateIDs, capitalID, lowerID} from 'core/id-parser';

export default class SquadRcon extends Rcon {
    processChatPacket(decodedPacket) {
        const matchChat = decodedPacket.body.match(
            /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:([^\]]+)\] (.+?) : (.*)/
        );
        if (matchChat) {
            Logger.verbose('SquadRcon', 2, `Matched chat message: ${decodedPacket.body}`);

            const result = {
                raw: decodedPacket.body,
                chat: matchChat[1],
                name: matchChat[3],
                message: matchChat[4],
                time: new Date()
            };
            iterateIDs(matchChat[2]).forEach((platform, id) => {
                result[lowerID(platform)] = id;
            });
            this.emit('CHAT_MESSAGE', result);
            return;
        }

        const matchPossessedAdminCam = decodedPacket.body.match(
            /\[Online Ids:([^\]]+)\] (.+) has possessed admin camera\./
        );
        if (matchPossessedAdminCam) {
            Logger.verbose('SquadRcon', 2, `Matched admin camera possessed: ${decodedPacket.body}`);
            const result = {
                raw: decodedPacket.body,
                name: matchPossessedAdminCam[2],
                time: new Date()
            };
            iterateIDs(matchPossessedAdminCam[1]).forEach((platform, id) => {
                result[lowerID(platform)] = id;
            });
            this.emit('POSSESSED_ADMIN_CAMERA', result);
            return;
        }

        const matchUnpossessedAdminCam = decodedPacket.body.match(
            /\[Online IDs:([^\]]+)\] (.+) has unpossessed admin camera\./
        );
        if (matchUnpossessedAdminCam) {
            Logger.verbose('SquadRcon', 2, `Matched admin camera unpossessed: ${decodedPacket.body}`);
            const result = {
                raw: decodedPacket.body,
                name: matchUnpossessedAdminCam[2],
                time: new Date()
            };
            iterateIDs(matchUnpossessedAdminCam[1]).forEach((platform, id) => {
                result[lowerID(platform)] = id;
            });
            this.emit('UNPOSSESSED_ADMIN_CAMERA', result);
            return;
        }

        const matchWarn = decodedPacket.body.match(
            /Remote admin has warned player (.*)\. Message was "(.*)"/
        );
        if (matchWarn) {
            Logger.verbose('SquadRcon', 2, `Matched warn message: ${decodedPacket.body}`);

            this.emit('PLAYER_WARNED', {
                raw: decodedPacket.body,
                name: matchWarn[1],
                reason: matchWarn[2],
                time: new Date()
            });

            return;
        }

        const matchKick = decodedPacket.body.match(
            /Kicked player ([0-9]+)\. \[Online IDs=([^\]]+)\] (.*)/
        );
        if (matchKick) {
            Logger.verbose('SquadRcon', 2, `Matched kick message: ${decodedPacket.body}`);

            const result = {
                raw: decodedPacket.body,
                playerID: matchKick[1],
                name: matchKick[3],
                time: new Date()
            };
            iterateIDs(matchKick[2]).forEach((platform, id) => {
                result[lowerID(platform)] = id;
            });
            this.emit('PLAYER_KICKED', result);
            return;
        }

        const matchSqCreated = decodedPacket.body.match(
            /(?<playerName>.+) \(Online IDs:([^)]+)\) has created Squad (?<squadID>\d+) \(Squad Name: (?<squadName>.+)\) on (?<teamName>.+)/
        );
        if (matchSqCreated) {
            Logger.verbose('SquadRcon', 2, `Matched Squad Created: ${decodedPacket.body}`);
            const result = {
                time: new Date(),
                ...matchSqCreated.groups
            };
            iterateIDs(matchSqCreated[2]).forEach((platform, id) => {
                result['player' + capitalID(platform)] = id;
            });
            this.emit('SQUAD_CREATED', result);
            return;
        }

        const matchBan = decodedPacket.body.match(
            /Banned player ([0-9]+)\. \[Online IDs=([^\]]+)\] (.*) for interval (.*)/
        );
        if (matchBan) {
            Logger.verbose('SquadRcon', 2, `Matched ban message: ${decodedPacket.body}`);

            const result = {
                raw: decodedPacket.body,
                playerID: matchBan[1],
                name: matchBan[3],
                interval: matchBan[4],
                time: new Date()
            };
            iterateIDs(matchBan[2]).forEach((platform, id) => {
                result[lowerID(platform)] = id;
            });
            this.emit('PLAYER_BANNED', result);
        }
    }

    async getCurrentMap() {
        const response = await this.execute('ShowCurrentMap');
        const match = response.match(/^Current level is ([^,]*), layer is ([^,]*)/);
        return {level: match[1], layer: match[2]};
    }

    async getNextMap() {
        const response = await this.execute('ShowNextMap');
        const match = response.match(/^Next level is ([^,]*), layer is ([^,]*)/);
        return {
            level: match ? (match[1] !== '' ? match[1] : null) : null,
            layer: match ? (match[2] !== 'To be voted' ? match[2] : null) : null
        };
    }

    async getListPlayers() {
        const response = await this.execute('ListPlayers');

        const players = [];

        if (!response || response.length < 1) return players;

        for (const line of response.split('\n')) {
            const match = line.match(
                /^ID: (?<playerID>\d+) \| Online IDs:([^|]+)\| Name: (?<name>.+) \| Team ID: (?<teamID>\d|N\/A) \| Squad ID: (?<squadID>\d+|N\/A) \| Is Leader: (?<isLeader>True|False) \| Role: (?<role>.+)$/
            );
            if (!match) continue;

            const data = match.groups;
            data.playerID = +data.playerID;
            data.isLeader = data.isLeader === 'True';
            data.teamID = data.teamID !== 'N/A' ? +data.teamID : null;
            data.squadID = data.squadID !== 'N/A' ? +data.squadID : null;
            iterateIDs(match[2]).forEach((platform, id) => {
                data[lowerID(platform)] = id;
            });
            players.push(data);
        }
        return players;
    }

    async getSquads() {
        const responseSquad = await this.execute('ListSquads');

        const squads = [];
        let teamName;
        let teamID;

        if (!responseSquad || responseSquad.length < 1) return squads;

        for (const line of responseSquad.split('\n')) {
            const match = line.match(
                /ID: (?<squadID>\d+) \| Name: (?<squadName>.+) \| Size: (?<size>\d+) \| Locked: (?<locked>True|False) \| Creator Name: (?<creatorName>.+) \| Creator Online IDs:([^|]+)/
            );
            const matchSide = line.match(/Team ID: (\d) \((.+)\)/);
            if (matchSide) {
                teamID = +matchSide[1];
                teamName = matchSide[2];
            }
            if (!match) continue;
            match.groups.squadID = +match.groups.squadID;
            const squad = {
                ...match.groups,
                teamID: teamID,
                teamName: teamName
            };
            iterateIDs(match[6]).forEach((platform, id) => {
                squad['creator' + capitalID(platform)] = id;
            });
            squads.push(squad);
        }
        return squads;
    }

    async broadcast(message) {
        await this.execute(`AdminBroadcast ${message}`);
    }

    async setFogOfWar(mode) {
        await this.execute(`AdminSetFogOfWar ${mode}`);
    }

    async warn(anyID, message) {
        await this.execute(`AdminWarn "${anyID}" ${message}`);
    }

    // 0 = Perm | 1m = 1 minute | 1d = 1 Day | 1M = 1 Month | etc...
    async ban(anyID, banLength, message) {
        await this.execute(`AdminBan "${anyID}" ${banLength} ${message}`);
    }

    async switchTeam(anyID) {
        await this.execute(`AdminForceTeamChange "${anyID}"`);
    }

    // 踢出玩家
    async SM_KickPlayer(steamID, message) {
        await this.execute(`AdminKick "${steamID}" ${message}`);
    }

    // 更换地图
    async SM_AdminChangeLayer(map) {
        await this.execute(`AdminChangeLayer "${map}"`);
    }

    // 预设地图
    async SM_AdminSetNextLayer(map) {
        await this.execute(`AdminSetNextLayer "${map}"`);
    }

    // 结束对局
    async SM_AdminEndMatch() {
        await this.execute(`AdminEndMatch`);
    }

    // 解散小队
    async SM_AdminDisbandSquad(teamid, squadid) {
        await this.execute(`AdminDisbandSquad ${teamid} ${squadid}`);
    }

    // 将玩家移出小队
    async SM_AdminRemovePlayerFromSquadById(playerid) {
        await this.execute(`AdminRemovePlayerFromSquadById ${playerid}`);
    }

    // 重置小队队名
    async SM_AdminRenameSquad(teamid, squadid) {
        await this.execute(`AdminRenameSquad ${teamid} ${squadid}`);
    }

    // 打乱阵营 参考至打乱阵营插件
    async SM_RandomTeam() {
        try {
            const players = await this.getListPlayers();
            // console.log('Players:', players); // 或者进行其他处理
            let currentIndex = players.length;
            let temporaryValue;
            let randomIndex;

            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                temporaryValue = players[currentIndex];
                players[currentIndex] = players[randomIndex];
                players[randomIndex] = temporaryValue;
            }

            let team = '1';
            for (const player of players) {
                if (player.teamID !== team) await this.switchTeam(player.steamID);

                team = team === '1' ? '2' : '1';
            }
        } catch (error) {
            console.error('打乱阵营', `出现错误: ${error.message}`);
        }
    }

    // 手动查询服务器信息
    async SM_ShowServerInfo() {
        const rawData = await this.rcon.execute(`ShowServerInfo`);

        const data = JSON.parse(rawData);

        const info = {
            raw: data,
            serverName: data.ServerName_s,

            maxPlayers: parseInt(data.MaxPlayers),
            publicQueueLimit: parseInt(data.PublicQueueLimit_I),
            reserveSlots: parseInt(data.PlayerReserveCount_I),

            playerCount: parseInt(data.PlayerCount_I),
            a2sPlayerCount: parseInt(data.PlayerCount_I),
            publicQueue: parseInt(data.PublicQueue_I),
            reserveQueue: parseInt(data.ReservedQueue_I),

            currentLayer: data.MapName_s,
            nextLayer: data.NextLayer_s,

            teamOne: data.TeamOne_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',
            teamTwo: data.TeamTwo_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',

            matchTimeout: parseFloat(data.MatchTimeout_d),
            matchStartTime: this.getMatchStartTimeByPlaytime(data.PLAYTIME_I),
            gameVersion: data.GameVersion_s
        };
        return info;
    }
}
