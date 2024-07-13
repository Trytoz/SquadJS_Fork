export default {
  regex:
    /^\[([0-9.:-]+)]\[([ 0-9]*)]LogSquadTrace: \[DedicatedServer\]ASQProjectile::ApplyExplosiveDamage\(\): HitActor=([^ ]+) DamageCauser=BP_([A-Za-z0-9_]+)_C_(\d+) DamageInstigator=([^ ]+) ExplosionLocation=V\(X=([-+]?\d+\.\d+), Y=([-+]?\d+\.\d+), Z=([-+]?\d+\.\d+)\)/,
  onMatch: (args, logParser) => {
    const data = {
      raw: args[0],
      time: args[1],
      chainID: +args[2],
      hitactor: args[3],
      fragtype: args[4],
      playercontroller: args[6],
      x: args[7],
      y: args[8],
      z: args[9]
    };


    logParser.emit('FRAG-DETONATES', data);
  }
};
