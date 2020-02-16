    // Position buttons on load
    $(window).on('load', function(){
        $('#banner').removeClass('hidden');
        $('#load_text_container').addClass('hidden');
        currentFixedUpdate = function(){};
    });
    
    $('#game_button').on('click',function(){
        $('#game-start-modal').modal('toggle');
    });
    
    $('.play-game-button').on('click',function(){
        $('#games_container').removeClass('hidden');
        if($(this).data('target') === 'snake'){
            $('.canvas').addClass('hidden');
            $('#banner').addClass('hidden');
            $('#snake_container').removeClass('hidden');
            $('#game-start-modal').modal('toggle');
            currentFixedUpdate = snakeFixedUpdate;
            createFood();
        }
    });
    
    $('#game_exit_button').on('click',function(){
       $('#games_container').addClass('hidden');
       currentFixedUpdate = function(){};
       $('#banner').removeClass('hidden');
       $('#game_over_container').addClass('hidden');
    });

    $('.arcade-button').on('mousedown',function(){
        pressArcadeButton($(this), 'down');
    });
    
    $('.arcade-button').on('mouseup',function(){
        pressArcadeButton($(this), 'up');
    });
    
    $('.arcade-button').on('dragend',function(){
        pressArcadeButton($(this),'up');
    });
    
    function pressArcadeButton(button, direction){
        var source = button.attr('src');
        if(direction === 'up'){
            var altered = source.replace('_pressed.png','.png');
        }else{
            var altered = source.replace('.png','_pressed.png');
        }
        button.attr('src',altered);
    }

    // Game Code =======================================
    // 
    // Basic Player Object

    var windowFocused = true;
    var currentFixedUpdate;


    var PlayerObject = function(domObject,score, speed){
        this.score = score;
        this.domObj = domObject;
        this.speed = speed;
    };
    
    PlayerObject.prototype.addScore = function(scoreIn){
        this.score = this.score + scoreIn;
    };
    
    PlayerObject.prototype.getScore = function (){
        return this.score;
    };
    
    PlayerObject.prototype.getSpeed = function (){
        return this.speed;
    };
    
    PlayerObject.prototype.setSpeed = function(speed){
        this.speed = speed;
    };
    
    PlayerObject.prototype.getDOM = function () {
        return this.domObj;
    };
    
    PlayerObject.prototype.setDOM = function (DOM){
        this.DOM = DOM;
    };
    
    // Snake Objects
    var PlayerSnake = function(domObject, score, speed){
        PlayerObject.apply(this, arguments);
    };
    
    PlayerSnake.prototype = new PlayerObject();
    
    var Collectible = function(data){
      this.score = data.score;
      this.type = data.type;
      this.DOM = data.domObj;
      this.timer = data.timer;
    };

    Collectible.prototype.collect = function(playerObj){
        this.DOM.remove();
        this.resolve();
        this.player = playerObj;
        return this.score;
    };
    
    Collectible.prototype.resolve = function(){
        window.console.log('resolving');
        this.DOM.remove();
    };
    
    Collectible.prototype.getDOM = function(){
        return this.DOM;
    };
    
    Collectible.prototype.setDOM = function(DOM){
        this.DOM = DOM;
    };
    
    Collectible.prototype.getScore = function(){
        return this.score;
    };
    
    Collectible.prototype.setScore = function(score){
        this.score = score;
    };
    
    Collectible.prototype.getType = function(){
        return this.type;
    };
    
    Collectible.prototype.setType = function(type){
        this.type = type;
    };
    
    var PowerUp = function(data){
      Collectible.apply(this,arguments);
      this.type = 'PowerUp';
      this.amount = data.amount;
    };
    
    PowerUp.prototype = Object.create(Collectible.prototype);
    PowerUp.prototype.collect = function (playerObj){
        this.player = playerObj;
        return this.score;
    };    
    
    var SpeedUp = function(data){
        PowerUp.apply(this,arguments);
    };
    
    SpeedUp.prototype = Object.create(PowerUp.prototype);
    SpeedUp.prototype.collect = function (playerObj){
        this.player = playerObj;
        playerObj.setSpeed(playerObj.getSpeed() + this.amount);
        return this.score;
    };
    
    var speedUpData = {};
    speedUpData['score'] = 500;
    speedUpData['domObj'] = null;
    speedUpData['timer'] = 300000;
    speedUpData['amount'] = 2;

    // ----------Snake Variables------------
    // Directions 0-3 for north to west, clockwise
    var snakeActive = true;
    var snakeDirection = 0;
    var snakePlayer = $('#player_block');
    var snakeWidth = Number(snakePlayer.css('width').replace('px',''));;
    var snakeBaseSpeed = 4;
    var snakeSpeed = snakeBaseSpeed;
    var snakeLineWidth = 8;
    var snakeLengthCounter = snakeSpeed;
    var snakeTailMax = 20;
    var currentTailMax = snakeTailMax;
    var snakeTails = [];
    var changeDirection = 99;
    var collisionObject = {};collisionObject['axis'] = 'x';collisionObject['value'] = 1;
    var snakeScore = 0;
    var snakeScoreMultiplier = 1;
    var basicFoodScore = 250;
    var snakeCollectibles = [];
    var boundingMargin = 10;
    var BOUNDARY_COLLISION = 0;


    
    // Snake Code Start
    var snakePlayerObj = new PlayerObject($('#player_block'), 0, snakeBaseSpeed);
    $(document).keydown(function(e) {
        var clone;
        switch(e.which) {
            case 37: // left
                if(snakeDirection === 2 | snakeDirection === 0)
                        return;
                changeDirection = 2;
                collisionObject['axis'] = 'x';
                collisionObject['value'] = -1;
                break;
            case 38: // up
                if(snakeDirection === 1 | snakeDirection === 3)
                        return;
                changeDirection = 3;
                collisionObject['axis'] = 'y';
                collisionObject['value'] = -1;
                break;
            case 39: // right
                if(snakeDirection === 0 | snakeDirection === 2)
                        return;
                changeDirection = 0;
                collisionObject['axis'] = 'x';
                collisionObject['value'] = 1;
                break;
            case 40: // down
                if(snakeDirection === 1 || snakeDirection === 3)
                    return;
                changeDirection = 1;
                collisionObject['axis'] = 'y';
                collisionObject['value'] = 1;
                break;
            default: 
            return; // exit this handler for other keys
        }
        e.preventDefault(); // prevent the default action (scroll / move caret)
    });
    
    function moveSnake(amount){
        var matrix = $.map(
            snakePlayer.css('transform') //get computed transform value, e.g.: matrix(1, 0, 0, 1, 1000, 0)
                .slice(7, -1)    //strip leading "matrix(" and trailing ")"
                .split(', '),    //split values into an array
            Number //map to numbers - Thanks Stack Overflow.
        );
        switch (snakeDirection){
            case 0:
                transformAmt = matrix[4] + amount;
                snakePlayer.css({"transform":"translate(" + transformAmt + "px," + matrix[5] + "px)"});
                break;
            case 1:
                transformAmt = matrix[5] + amount;
                snakePlayer.css({"transform":"translate(" + matrix[4] + "px," + transformAmt + "px)"});
                break;
            case 2:
                transformAmt = matrix[4] - amount;
                snakePlayer.css({"transform":"translate(" + transformAmt + "px," + matrix[5] + "px)"});
                break;
            case 3:
                transformAmt = matrix[5] - amount;
                snakePlayer.css({"transform":"translate(" + matrix[4] +"px," + transformAmt + "px)"});
                break;
            default:
            return;
        }
        snakeLengthCounter += amount;
    }
    
    function createFood(){
        var chanceX = Math.floor(Math.random() * $(window).width());
        var chanceY = Math.floor(Math.random() * $(window).height());
        var food = document.createElement('div');
        food.className = 'snake-food collectible';
        //food.setAttribute('style','top:' + chanceY + 'px;' + 'right:' + chanceX + 'px');
        //$('#snake_container').append($(food));
        placeSnakeCollectible(food);
        var foodData = {};
        foodData['score'] = basicFoodScore;
        foodData['type'] = 'food';
        foodData['domObj'] = food;
        foodData['timer'] = -1;
        var foodObj = new Collectible(foodData);
        // Use the get(0) to actually store the object for comparison later
        snakeCollectibles.push(foodObj);
    }
    
    function createSnakeTail(){
        // Each tail is a segment added to an array
        // Remove segments from the array and from the DOM
        if(currentTailMax <= snakeTails.length){
            var segment = snakeTails[0];
            snakeTails.shift();
            segment.remove();
        }
        clone = snakePlayer.clone();
        clone.attr('id','');
        clone.addClass('snake_tail');
        snakeTails.push(clone);
        $('#snake_container').append(clone);
    }
    
    function createPowerUp(){
        var chance = Math.floor(Math.random() * 50000);
        if(chance > 49900){
            window.console.log(speedUpData);
            var speedUpper = new SpeedUp(speedUpData);
            window.console.log(speedUpper);
            //var chanceX = Math.floor(Math.random() * $(window).width());
            //var chanceY = Math.floor(Math.random() * $(window).height());
            var power = document.createElement('div');
            power.className = 'power-up speed-up collectible';
            //power.setAttribute('style','top:' + chanceY + 'px;' + 'right:' + chanceX + 'px');
            power.innerHTML = 'S';
            //$('#snake_container').append($(power));
            placeSnakeCollectible(power);
            var powerObj = new SpeedUp(speedUpData);
            powerObj.DOM = power;
            window.console.log(powerObj);
            // Use the get(0) to actually store the object for comparison later
            snakeCollectibles.push(powerObj);
        }
    }
    
    var snakeFixedUpdate = function (){
        if(!windowFocused || !snakeActive)
            return;
        // Begin creating a tail if it has traversed the length of a player
        if(snakeLengthCounter >= snakeLineWidth){
            createSnakeTail();
            snakeLengthCounter = 0;
            // Limit input options so turns can only happen at snake width intervals (prevents overlapping)
            // 99 is an arbitrary number.  Jut don't tell 99 that, it thinks it's special.
            if(changeDirection < 99){
                snakeDirection = changeDirection;
                changeDirection = 99;
            }
        }
        checkCollision(snakePlayer,collisionObject);
        moveSnake(snakePlayerObj.getSpeed());
        createPowerUp();
    };
    
    var textOneByOneTransition = function (target,text, index, interval){
        if(!windowFocused)
            return;
        if(index == 0)
            target.html('');
        // 
        target.html(text[index++]);
        setTimeout(function(){
            textOneByOneTransition(target, text, index, interval);
        }, interval);
    };
    
    var textAddOneByOneTransition = function (target,text, index, interval, callback){
        if(index == text.length){
            callback();
            return;
        }
        if(index == 0)
            target.html('');
        // 
        target.html(target.html() + text[index++]);
        setTimeout(function(){
            textAddOneByOneTransition(target, text, index, interval,callback);
        }, interval);
    };
    
    //currentFixedUpdate = snakeFixedUpdate;
    //currentFixedUpdate = animateLoadText;
    setInterval(function(){
        currentFixedUpdate()}, 33
    );
    
    function checkCollision(element, collisionObj){
        var bounds;
        if(collisionObj.axis === 'x'){
            bounds = element.width();
        }else{
            bounds = element.height();
        }
        var position = element.position();
        // Collision detection that checks the entire area where speed will occopy in the next update
        // Probably can do a more efficient collision detection with determining bounding boxes
        for(var i = 0; i <= bounds;i++){
            for(var k = 1;k <= snakePlayerObj.getSpeed();k++){
                var possibleElement;
                if(collisionObj.axis === 'x'){
                    possibleElement = document.elementFromPoint(position.left + i, position.top + k);
                    if(!possibleElement || $(possibleElement).data('collision') === 0){
                        snakeGameOver();
                        currentFixedUpdate = function(){};
                        return;
                    }else if(possibleElement.className.indexOf('collectible') > 0){
                        addToScore(collectSnakeItem(possibleElement));
                        if(possibleElement.className.indexOf('snake-food') >= 0){
                            currentTailMax += snakeTailMax;
                            createFood();
                            return;
                        }
                    }
                }else{
                    possibleElement = document.elementFromPoint(position.left + k, position.top + i);
                    if(!possibleElement || $(possibleElement).data('collision') === 0){
                        snakeGameOver();
                        currentFixedUpdate = function(){};
                        return;
                    }else if(possibleElement.className.indexOf('collectible') > 0){
                        addToScore(collectSnakeItem(possibleElement));
                        if(possibleElement.className.indexOf('snake-food') >= 0){
                            currentTailMax += snakeTailMax;
                            createFood();
                            return;
                        }
                    }                    
                }
            }
        }
    }
    
    function collectSnakeItem(item){
        var removalIndex;
        var scoreOut = 0;
        for(var i = 0;i < snakeCollectibles.length;i++){
            if(item === snakeCollectibles[i].getDOM()){
                removalIndex = i;
                scoreOut = snakeCollectibles[i].collect(snakePlayerObj);
                snakeCollectibles[i].resolve();
            }
        }
        snakeCollectibles.splice(removalIndex,1);
        window.console.log(scoreOut);
        return scoreOut;
    }
    
    function addToScore(amount){
        snakeScore += (amount * snakeScoreMultiplier);
        $('#snake_score').html('Score: ' + snakeScore);
    }

    $(window).focus(function() {
        windowFocused = true;
    });

    $(window).blur(function() {
        windowFocused =false;
    });
    
    function placeSnakeCollectible(elementIn){
        var xMin = Math.round(styleToNumber('#snake_container', 'margin-left')) + boundingMargin;
        var xMax = Math.round(styleToNumber('#snake_container', 'width')) - boundingMargin;
        var yMin = Math.round(styleToNumber('#snake_container', 'margin-top')) + boundingMargin;
        var yMax = Math.round(styleToNumber('#snake_container', 'height')) - boundingMargin;
        window.console.log('xmin: ' + (xMin + boundingMargin));
        var posx = randomIntFromInterval(xMin, xMax);
        var posy = randomIntFromInterval(yMin, yMax);
        /*
        var out = {};
        out['posX'] = posx;
        out['posY'] = posy;
        return out;
        */
        elementIn.setAttribute('style','top:' + posy + 'px;' + 'left:' + posx + 'px');
        $('#snake_container').append($(elementIn));
    }
    
    function reconfigureSnakePlayer(){
        if(snakeDirection === 2 || snakeDirection === 0){
            snakePlayer.css('width',snakeSpeed);
            snakePlayer.css('height',snakeLineWidth);
        }else{
            snakePlayer.css('height',snakeSpeed);
            snakePlayer.css('width',snakeLineWidth);
        }
    }
    
    function snakeGameOver(){
        $('#game_over_container').removeClass('hidden');
        $('#play_again_button').on('click',function(){
            $('#game_over_container').addClass('hidden');
            snakePlayer.css('transform','translate(50px,50px');
            $('.snake_tail').remove();
            snakeSpeed = snakeBaseSpeed;
            snakeDirection = 0;
            $('.collectible').remove();
            currentFixedUpdate = snakeFixedUpdate;
            createFood();
        });
    }
    
    function randomIntFromInterval(min,max){
        var number =  Math.floor(Math.random()*(max-min+1)+min);
        if(number < 0){
            number *= -1;
        }
        return number;
    }
    
    function styleToNumber(element,style){
        var number = $(element).css(style);
        number = number.replace('px','');
        window.console.log(number);
        return number;
    }
    
    // Position an element to that of another
    function positionOff(victim, example){
        position = example.position();
        victim.css('top', position.top + 'px');
        victim.css('left',position.left + 'px');
    }
    
    // Scales a target element to a percent of another
    function scaleToElement(victim, example, percentX, percentY){
        width = styleToNumber(example, 'width');
        height = styleToNumber(example, 'height');
        scaleX = parseInt(width) * percentX;
        scaleY = parseInt(height) * percentY;
        victim.css('width',scaleX);
        victim.css('height',scaleY);
    }

    function moveElementByDimension(element, dimension, direction, modify){
        originalPosition = styleToNumber(element,modify);
        originalValue = styleToNumber(element,dimension);
        window.console.log(originalValue);
        amount = originalValue * direction;
        window.console.log(amount);
        element.css(modify, parseInt(amount) + parseInt(originalPosition) + 'px');
        window.console.log(element.css('top'));
    }

    
    snakePlayer.css('transform','translate(50px,50px');