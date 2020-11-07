const rayCast = (originX, originY, angle, playersGroup, maxDistance) => {
    const line = new Phaser.Geom.Line();
    Phaser.Geom.Line.SetToAngle(line, originX, originY, angle, maxDistance + 100);
    let hit;
    if(playersGroup){
        playersGroup.getChildren().forEach((player) => {
            const intersections = Phaser.Geom.Intersects.GetLineToRectangle(line, player.hitbox);
            if(intersections.length > 0){
                let closestIntersection;
                intersections.forEach((intersection) => {
                    const distance = Phaser.Math.Distance.Between(originX, originY, intersection.x, intersection.y);
                    if(!closestIntersection || closestIntersection.distance > distance){
                        closestIntersection = { intersection, distance };
                    }
                });
                if(!hit || hit.distance > closestIntersection.distance){
                    hit = { ...closestIntersection, playerId: player.playerId };
                }
            }
        });
    }
    return hit;
};

exports.rayCast = rayCast;