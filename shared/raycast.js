const rayCast = (tileMapLayer, originX, originY, angle, playersGroup, maxDistance, scene) => {
    const line = new Phaser.Geom.Line();
    Phaser.Geom.Line.SetToAngle(line, originX, originY, angle, maxDistance + 100);
    let hit;
    if(playersGroup && tileMapLayer){
        let intersectingTiles = tileMapLayer.getTilesWithinShape(line, { isColliding: true }).map((tile) => {
            const hitbox = new Phaser.Geom.Rectangle(tile.pixelX, tile.pixelY + tileMapLayer.y, tile.width, tile.height);
            return {
                ...tile,
                type: 'tile',
                hitbox: hitbox
            };
        });

        const intersectingObjects = intersectingTiles.concat(playersGroup.getChildren().map((p) => { return { ...p, type: 'player' }}));
        intersectingObjects.forEach((object) => {
            const intersections = Phaser.Geom.Intersects.GetLineToRectangle(line, object.hitbox);
            if(intersections.length > 0){
                let closestIntersection;
                intersections.forEach((intersection) => {
                    const distance = Phaser.Math.Distance.Between(originX, originY, intersection.x, intersection.y);
                    if(!closestIntersection || closestIntersection.distance > distance){
                        closestIntersection = { intersection, distance };
                    }
                });
                if(!hit || hit.distance > closestIntersection.distance){
                    hit = { ...closestIntersection, object };
                }
            }
        });
    }
    return hit;
};

exports.rayCast = rayCast;