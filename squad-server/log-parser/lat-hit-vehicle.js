export default {
  regex:
    /^\[([0-9.:-]+)]\[([ 0-9]*)]LogSquadTrace: \[DedicatedServer\]ASQVehicleSeat::TraceAndMessageClient\(\): (.+): ([0-9. ]+) damage taken by causer ([^ ]+) instigator \(Online Ids: (.+?)\) EOS: ([0-9a-f]{32}) steam: (\d{17}) health remaining ([0-9.]+)/,
  onMatch: (args, logParser) => {
    const data = {
      raw: args[0],
      time: args[1],
      chainID: +args[2],
      victim_obj: args[3],
      damage: args[4],
      weapon: args[5],
      player_name : args[6],
      player_eosid : args[7],
      player_steamid : args[8],
      health: args[9],
    };
    logParser.emit('LAT-HIT-VEHICLE', data);
  }
};
