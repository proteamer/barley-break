var initGame = function(matrix) {

    var gameField = $("div.game-field");
    var countField = $("span.count-steps");

    var start = $("span.start-button");
    var resolve = $("span.resolve-button");
    var error = $("p.error");

    var loader = new Loader( $("div.loader") );

    var cntSteps = 0;
    var solutionExists = true;

    var renderSettings = {
        blockSize: 50,
        spaceSize: 5
    };

    var action = function(col, row) {
        var zero = getZeroPoint(matrix);
        switchPoint({row: row, col: col}, zero, matrix);
        cntSteps++;

        if( isSolved(matrix) ) {
            resolve.addClass("hide");
            start.removeClass("hide");
        }

        render(matrix);
    };

    var render = function(arMatrix, lightPoint) {
        var div, top, left, buttons;
        countField.text(cntSteps);

        gameField.find("*").remove();

        for( var i = 0; i < 4; i++ ) {
            top = i * (renderSettings.blockSize + renderSettings.spaceSize) + "px";
            for( var k = 0; k < 4; k++ ) {
                left = k * (renderSettings.blockSize + renderSettings.spaceSize) + "px";

                div = document.createElement("div");

                $(div).css("top", top);
                $(div).css("left", left);

                if( arMatrix[i][k] != 0 ) {
                    if( lightPoint && comparePoints(lightPoint, {row: i, col: k}) )
                        $(div).addClass("light");
                    $(div).html("<p>" + arMatrix[i][k] + "</p>");
                } else
                    $(div).addClass("null-field");

                gameField.append(div);
            }
        }

        buttons = gameField.find("div");

        buttons.bind("click", function() {

            if( loader.isLoaded() ) {
                var index = buttons.index(this);
                var col = index%4;
                var row = parseInt(index/4);
                var zeroPoint = getZeroPoint(matrix);

                if( Math.abs(zeroPoint.col-col) == 1 && Math.abs(zeroPoint.row-row) == 0 || Math.abs(zeroPoint.col-col) == 0 && Math.abs(zeroPoint.row-row) == 1 ) {
                    action(col, row);
                }
            }
        });
    };

    var shuffle = function(showAnimate, cb) {
        var matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,0]];
        var map = getNullMatrix();
        var zPoint = getZeroPoint(matrix);
        var shuffleSteps = 160;
        var posPoints,nextInd,bPoint = null;
        cntSteps = 0;
        loader.start();

        var timer = setInterval(function() {
            shuffleSteps--;
            posPoints = getAroundPoints(zPoint, map);
            nextInd = parseInt(Math.random()*posPoints.length);
            map[zPoint.row][zPoint.col] = 1;
            matrix = switchPoint(zPoint, posPoints[nextInd], matrix);

            if( bPoint !== null )
                map[bPoint.row][bPoint.col] = 0;

            bPoint = zPoint;
            zPoint = posPoints[nextInd];

            if( showAnimate )
                render(matrix);
            else if( shuffleSteps <= 0 )
                render(matrix);


            if( shuffleSteps <= 0 ) {
                clearInterval(timer);
                loader.stop();
                cb && cb(matrix);
            }

        }, showAnimate ? 50: 1 );
    };

    var solution = function(matrix, cb) {
        loader.start();
        getSolutionSteps(matrix, function(steps) {
            var zero = getZeroPoint(matrix);
            var point;
            var time = setInterval(function(){
                point = steps.shift();
                if( !point ) {
                    clearInterval(time);
                    loader.stop();
                    cb && cb();
                    return;
                }
                cntSteps++;
                switchPoint(point, zero, matrix) ;
                zero = point;
                render(matrix);
            }, 100);
        });
    };

    if( typeof matrix == "undefined" ) {
        matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,0]];
    } else {
        start.addClass("hide");
        if( !checkMatrix(matrix) ) {
            solutionExists = false;
            error.removeClass("hide");
        } else {
            resolve.removeClass("hide");
        }
    }

    render(matrix);

    start.bind("click", function(){
        if( loader.isLoaded() ) {
            start.addClass("hide");
            shuffle(false, function(x) {
                if( solutionExists )
                    resolve.removeClass("hide");
                matrix = x;
            });

        }
    });

    resolve.bind("click", function() {
        if( loader.isLoaded() ) {
            resolve.addClass("hide");
            solution(matrix, function() {
                start.removeClass("hide");
            });
        }
    });

};

/* Tools class */
var Loader = function(domLoader) {
    "use strict";
    var isBlocked = false;

    this.start = function() {
        isBlocked = true;
        domLoader.removeClass("hide");
    };

    this.stop = function() {
        isBlocked = false;
        domLoader.addClass("hide");
    };

    this.isLoaded = function() {
        return !isBlocked;
    }
};

/* Поиск пути по алгаритму близкому к A* */
var WayFinder = function() {
    "use strict";
    var openList = [];
    var closeList = [];
    var startPoint, endPoint, pole;

    var calcH = function(a, b) {
        return (Math.abs(a.row - b.row) + Math.abs(a.col - b.col)) * 2;
    };

    var inList = function(point, list) {
        for( var i in list ) {
            if( list[i].location.row == point.row && list[i].location.col == point.col ) {
                return i;
            }
        }
        return false;
    };

    var addPointToOpenList = function(point, parent) {
        var g,h;

        if( inList(point, openList) === false ) {
            g = parent.weight.g + 1;
            h = calcH(point, endPoint);

            openList.push({
                location: {row: point.row, col: point.col},
                parent: parent,
                weight: {
                    f: g + h,
                    g: g,
                    h: h
                }
            });
        }
    };

    var getNextPoint = function() {
        var minF = null,point,result = null;
        if( openList.length != 0 ) {
            for( var i in openList ) {
                if( minF == null || minF > openList[i].weight.f) {
                    minF = openList[i].weight.f;
                    point = i;
                }
            }

            result = openList[point];
            closeList.push(result);
            openList.splice(point, 1);
        }

        return result;
    };

    var checkRelatedPoints = function(rootPoint) {
        var row = rootPoint.location.row;
        var col = rootPoint.location.col;

        var rPoints = getRelatedPoints(row, col);
        for( var i in rPoints ) {
            if( inList(rPoints[i], closeList) === false ) {
                addPointToOpenList(rPoints[i], rootPoint);
            }
        }
    };

    var getRelatedPoints = function(row, col) {
        var result = [];
        var nPoint = [];
        for( var k = 0; k < 2; k += 0.5 ) {
            nPoint = {
                row: row + Math.round(Math.sin(Math.PI*k)),
                col: col + Math.round(Math.cos(Math.PI*k))
            };

            if( pole[nPoint.row] && pole[nPoint.row][nPoint.col] === 0 ) {
                result.push(nPoint);
            }
        }

        return result;
    };

    var getWay = function() {
        var way = [];
        var endWay = false;
        var currentPoint = endPoint;
        var i;

        while( !endWay ) {
            i = inList(currentPoint, closeList);

            way.push(closeList[i].location);

            if( closeList[i].parent !== null ) {
                currentPoint = closeList[i].parent.location;

                if( closeList[i].parent.location.row == startPoint.row && closeList[i].parent.location.col == startPoint.col )
                    endWay = true;
            }
        }
        return way;
    };

    var nextStep = function() {
        var nPoint = getNextPoint();

        if( nPoint === null ) {
            return null;
        }

        if( endPoint.row == nPoint.location.row && endPoint.col == nPoint.location.col)
            return getWay();

        checkRelatedPoints(nPoint);

        return false;
    };

    this.getWay = function(start, end, field) {
        startPoint = start;
        endPoint = end;
        var wayPoint = false;

        if( startPoint.row == endPoint.row && startPoint.col == endPoint.col )
            return [];

        openList = [];
        closeList = [];

        pole = field || [
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0]
        ];
        openList.push({
            location: {row: start.row, col: start.col},
            parent: null,
            weight: {f: 0, g: 0, h: 0}
        });

        while( wayPoint === false ) {
            wayPoint = nextStep();
        }
        return wayPoint;
    }
};

/* Tools function */

var generateMatrix = function() {
    var arValues = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    var arMatrix = [];

    for( var tmp,k,i = arValues.length; i > 0;
         k = parseInt(Math.random() * i),
             tmp = arValues[--i],
             arValues[i] = arValues[k],
             arValues[k] = tmp
        ){};

    for( i = 0; i < 4; i++ ) {
        arMatrix[i] = [];
        for( k = 0; k < 4; k++ )
            arMatrix[i][k] = arValues.pop();
    }

    return arMatrix;
};

// получение координат точки
var getIndexFromNum = function(index) {
    index = index - 1;
    return {row: parseInt(index/4), col: index%4};
};

var switchPoint = function(a, b, matrix) {
    var tmp = matrix[a.row][a.col];
    matrix[a.row][a.col] = matrix[b.row][b.col];
    matrix[b.row][b.col] = tmp;
    return matrix;
};

var getNullMatrix = function() {
    return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
//        var n = 4;
//        var result = [];
//
//        for( var i = 0; i < n; i++ ) {
//            result[i] = [];
//            for( var k = 0; k < n; k++ )
//                result[i].push(0);
//        }
//        return result;
}

// получение индекса заданного значения @val в матрице @arMatrix
var getPoint = function(arMatrix, val) {
    for( var i = 0; i < arMatrix.length; i++ ) {
        for ( var k = 0; k < arMatrix[i].length; k ++ ) {
            if( arMatrix[i][k] == val ) {
                return {row: i, col: k};

            }
        }
    }
    return false;
};

var comparePoints = function(a, b) {
    return (a.row == b.row && a.col == b.col);
};

var getZeroPoint = function(arMatrix) {
    return getPoint(arMatrix, 0);
};

/* * * * * *
 * получение соседних точек для точки @point
 * c учетом достпности точек задаваемой матрицей @pole
 * параметр @k отвечает за то насколько соседние должны быть точки
 * @closePoint отвечает поиск точек в закрытой зоне
 * * * * * */
var getAroundPoints = function(point, pole, k, closePoint) {
    k = k || 1;
    var i = k;
    var result = [];
    var flag = 1;
    var nPoint;

    for( var n = 0; n < 2; n += 0.5 ) {
        nPoint = {
            row: point.row + Math.round(Math.sin(Math.PI*n)) * k,
            col: point.col + Math.round(Math.cos(Math.PI*n)) * k
        };

        if( pole[nPoint.row] && pole[nPoint.row][nPoint.col] === 0 && !closePoint )
            result.push(nPoint);

        if( pole[nPoint.row] && pole[nPoint.row][nPoint.col] == 2 && closePoint )
            result.push(nPoint);
    }

    return result;
};

var setState = function(matrix, point, state) {
    matrix[point.row][point.col] = state;
};

var copyMatrix = function(origin) {
    var copy = [];
    for( var i = 0; i < origin.length; i++) {
        copy[i] = [];
        for( var k = 0; k < origin[i].length; k++)
            copy[i].push( origin[i][k] );
    }
    return copy;
};

// проверка головоломки на решаемость
var checkMatrix = function(arMatrix) {
    var arLine = (function(matrix){
        var m = [];
        for( var i = 0; i < matrix.length; i++ ) {
            for( var k = 0; k < matrix[i].length; k++ )
                m.push(matrix[i][k]);
        }
        return m;
    })(arMatrix);

    var e = 0;
    try {
        for( var i = 0; i < 16; i++) {
            if( arLine[i] == 0 ) {
                e += parseInt(i/4)+1;
                continue;
            }
            for( var k = i+1; k < 16; k++ ) {
                if( arLine[i] > arLine[k] && arLine[k] != 0 )
                    e++;
            }
        }
        return e%2 ? false : true;
    } catch (e) {
        return false;
    }
};

var isSolved = function(matrix) {
    var prevVal = 0;
    for( var i = 0; i < matrix.length; i++ )
        for( var k = 0; k < matrix[i].length; k++ ) {
            if( matrix[i][k] < prevVal && !(i == matrix.length-1 && k == matrix[i].length-1 && matrix[i][k] == 0) )
                return false;
            prevVal = matrix[i][k];
        }
    return true;
};

var getSolutionSteps = function(originMatrix, cb) {

    var matrix = copyMatrix(originMatrix);

    /*
     * Массив хранит карту по текущей занятости ячеек
     * 0 - ячейка ничем не занята и может быть использована для постоения пути
     * 1 - ячейка временно занята
     * 2 - в ячейку остановлена нужное цифра головоломки
     * 3 - этим значением отмечаются полностью отработаные строки
     */
    var readyPoints = getNullMatrix();
    var wayFinder = new WayFinder();

    var route = [1,2,3,4,5,6,7,8,9,13,10,14,11,12,15];
    var curPoint,truePoint,pointNum;

    var allSteps = [];

    var step = function(point, zeroPoint) {
        zeroPoint = getZeroPoint(matrix);
        allSteps.push(point);
        switchPoint(point, zeroPoint, matrix);
    };

    /*
     * Передвигание костяшки в указанную ячейку
     * */
    var passingPath = function(start, end, pole) {
        var zeroWayPoint, zPoint, zeroWay, nextPoint, way = wayFinder.getWay(start, end, pole);

        while( nextPoint = way.pop() ) {
            zPoint = getZeroPoint(matrix);

            if( comparePoints(zPoint, nextPoint) ) {
                step(start, zPoint);
                zPoint = start;

                start = nextPoint;
            } else {
                pole[start.row][start.col] = 1;
                zeroWay = wayFinder.getWay(zPoint, nextPoint, pole);
                pole[start.row][start.col] = 0;

                if( zeroWay === null ) {
                    // Ошибка поиска пути по стандартному алгоритму
                    return false;
                }

                while( zeroWayPoint = zeroWay.pop() ) {
                    step(zeroWayPoint, zPoint);
                    zPoint = zeroWayPoint;
                }

                step(start, zPoint);
                zPoint = start;

                start = nextPoint;
            }
        }
        return true;
    };

    var timer = setInterval(function() {

        pointNum = route.shift();

        if( typeof pointNum == "undefined" ) {
            cb && cb(allSteps);
            clearInterval(timer);
            return;
        }

        curPoint = getPoint(matrix, pointNum);
        truePoint = getIndexFromNum(pointNum);

        if( comparePoints(curPoint, truePoint) ) {
            setState(readyPoints, truePoint, 2);
        } else {
            switch( pointNum ) {
                // в этих случаях клетка с указнным значением просто перемещается на свою позицию
                case 1: case 2: case 3: case 5: case 6: case 7: case 9: case 10: case 12: case 11: case 15:
                if( passingPath(curPoint, truePoint, readyPoints) ) {
                    setState(readyPoints, truePoint, 2);
                }
                break;

                case 4: case 8: case 13: case 14:
                var fastWay = wayFinder.getWay(curPoint, truePoint, readyPoints).pop();
                var zPoint = getZeroPoint(matrix);

                if( comparePoints(zPoint, fastWay) && comparePoints(truePoint, zPoint) ) {
                    step(curPoint, zPoint);
                    zPoint = curPoint;
                } else {
                    var checkPoints = getAroundPoints(truePoint, readyPoints, 2);
                    // точка ниже целевой точки на 2 клетки
                    var tmpPoint = checkPoints.shift();
                    // установка нужной ячейки во временную позицию
                    if( passingPath(curPoint, tmpPoint, readyPoints) ) {
                        var zeroWay, zeroWayPoint;

                        // блокируем временную позицию
                        setState(readyPoints, tmpPoint, 1);

                        zPoint = getZeroPoint(matrix);
                        // ищем путь ноля в целевую точку
                        zeroWay = wayFinder.getWay(zPoint, truePoint, readyPoints);

                        // перестановка нолевого значения до целевой точки
                        while( zeroWayPoint = zeroWay.pop() ) {
                            //action(zeroWayPoint.col, zeroWayPoint.row);
                            step(zeroWayPoint, zPoint);
                            zPoint = zeroWayPoint;
                        }

                        zPoint = truePoint;
                        // ищем рядом стоящую, с нулевой, точку из недособранной строки
                        var prevPoint = getAroundPoints(zPoint, readyPoints, 1, true).shift();
                        // переносим ее в целевую ячейку
                        //action(prevPoint.col, prevPoint.row);
                        step(prevPoint, zPoint);
                        zPoint = prevPoint;

                        // освобождаем ячейку в которой нет нужного элемента
                        // readyPoints[prevPoint.row][prevPoint.col] = 0;
                        setState(readyPoints, prevPoint, 0);


                        // вероятно вместо этого надо использовать массив полученный в начале этого блока case
                        var tmpWay = wayFinder.getWay(tmpPoint, truePoint, readyPoints);
                        var t = tmpWay.pop();

                        // и временно блокируем
                        setState(readyPoints, truePoint, 1);
                        setState(readyPoints, tmpPoint, 0);

                        if( passingPath(tmpPoint, t, readyPoints) ) {
                            //readyPoints[t.row][t.col] = 1;
                            setState(readyPoints, t, 1);

                            // возвращаем тронутую точку наместо
                            passingPath(truePoint, prevPoint, readyPoints);
                            setState(readyPoints, prevPoint, 2);
                            zPoint = getZeroPoint(matrix);
                            step(t, zPoint);
                            zPoint = t;
                            setState(readyPoints, t, 0);
                            setState(readyPoints, truePoint, 2);
                        }
                    }
                }
                break;
            }
        }

        var rowReady = true, colReady = true;

        for( var i = 0; i < 4; i++ ) if( readyPoints[truePoint.row][i] < 2 )
            rowReady = false;

        if( rowReady ) for( i = 0; i < 4; i++ )
            readyPoints[truePoint.row][i] = 3;

        for( i = 0; i < 4; i++ ) if( readyPoints[i][truePoint.col] < 2 )
            colReady = false;

        if( colReady ) for( i = 0; i < 4; i++ )
            readyPoints[i][truePoint.col] = 3;

    }, 1);
};




$(function(){
    initGame();

    // загрузка рандомной мтрицы
//    initGame( generateMatrix() );

    // загрузка заданой матрицы
//    initGame( [
//        [3, 9, 0, 7],
//        [6, 2, 1, 13],
//        [15, 11, 10, 4],
//        [8, 14, 12, 5]
//    ] );

});