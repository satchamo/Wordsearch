function Trie(words){
    var root = {}

    // returns 2 if there is a path through the trie consisting of the letters
    // in word, AND word is a "complete" word
    // returns 1 if there is a path through the trie consisting of the letters
    // in word
    // 0 if the word doesn't exist in any form in the trie
    this.exists = function(word){
        var node = root;
        for(var i = 0; i < word.length; i++){
            var c = word[i];
            if(c in node){
                node = node[c]
            } else {
                return 0;
            }
        }

        // is a word
        if(node.is_word) return 2;
        // is a prefix to a word
        return 1;
    }

    // takes a step in trie based on the letter c starting at the root, or node
    // If the step leads to nowhere, return 0, else return the node we stepped to
    this.step = function(c, node){
        if(!node)
            node = root

        if(c in node)
            return node[c];

        return 0;
    }

    // insert a word into the trie
    this.insert = function(word){
        var node = root;
        for(var i = 0; i < word.length; i++){
            var c = word[i]
            if(c in node){
                node = node[c]
            } else {
                node = node[c] = {"is_word": false}
            }
        }
        node.is_word = true;
    }

    // add all the words to the trie
    for(var i = 0; i < words.length; i++){
        this.insert(words[i]);    
    }
}


// Every item in a word search grid is one of these
function Cell(letter){
    this.letter = letter;
    this.words = {};
    this.is_part_of_word = false;
    this.dir = 0

    this.addWordInDirection = function(word_index, direction){
        this.is_part_of_word = true;
        this.words[word_index] = direction;
        this.dir |= direction;
    }

    this.removeWordInDirection = function(word_index, direction){
        if(this.dir == direction){
            // this cell is *not* part of multiple words
            // so reset everything
            this.letter = null;
            this.is_part_of_word = false;
            this.dir = 0;
        } else {
            // this cell is part of multiple words so just remove the direction
            this.dir &= ~direction;
        }

        delete this.words[word_index];
    }
}

function WordSearch(words, badwords){
    // using powers of 2 so I can do some bitwise stuff
    var directions = {
        LEFT_TO_RIGHT: 1,
        UP_TO_DOWN: 4,
        DOWN_TO_UP: 8,
        UP_LEFT_TO_DOWN_RIGHT: 16,
        DOWN_LEFT_TO_UP_RIGHT: 64,
        RIGHT_TO_LEFT: 2,
        UP_RIGHT_TO_DOWN_LEFT: 32,
        DOWN_RIGHT_TO_UP_LEFT: 128
    }

    // functions that "step" in each direction
    var step_functions = {};
    step_functions[directions.LEFT_TO_RIGHT]         = function(row, col) { return [row, col + 1]; }
    step_functions[directions.RIGHT_TO_LEFT]         = function(row, col) { return [row, col - 1]; }

    step_functions[directions.UP_TO_DOWN]            = function(row, col) { return [row + 1, col]; }
    step_functions[directions.UP_LEFT_TO_DOWN_RIGHT] = function(row, col) { return [row + 1, col + 1]; }
    step_functions[directions.UP_RIGHT_TO_DOWN_LEFT] = function(row, col) { return [row + 1, col - 1]; }

    step_functions[directions.DOWN_TO_UP]            = function(row, col) { return [row - 1, col]; }
    step_functions[directions.DOWN_LEFT_TO_UP_RIGHT] = function(row, col) { return [row - 1, col + 1]; }
    step_functions[directions.DOWN_RIGHT_TO_UP_LEFT] = function(row, col) { return [row - 1, col - 1]; }

    // assumes badwords are in upper case
    var trie = new Trie(badwords);

    // list of words that could not be added to the word search
    var failed = [];

    // convert words to upper case
    var words = words.slice(0);
    for(var i = 0; i < words.length; i++){
        words[i] = words[i].toUpperCase();
    }

    // return a number on the interval [min, max]
    var randInRange = function(min, max){
        return Math.floor(min+Math.random()*(max - min + 1))
    }

    // return a number from the set {A..Z}
    var randomLetter = function(){
        var min = 65, max = 90;
        return String.fromCharCode(randInRange(min, max));
    }

    // shuffle an array with fisher-yates
    var shuffle = function(array) {
        var tmp, current, top = array.length;

        if(top) while(--top) {
            current = Math.floor(Math.random() * (top + 1));
            tmp = array[current];
            array[current] = array[top];
            array[top] = tmp;
        }

        return array;
    }

    // try to place a word on the grid starting at row, col, going in direction
    // return false if it can't be done, or true on successful placement on the grid
    var placeWordAt = function(grid, index, row, col, direction){
        var word = words[index];

        // check bounds
        var check_right = directions.LEFT_TO_RIGHT | directions.UP_LEFT_TO_DOWN_RIGHT | directions.DOWN_LEFT_TO_UP_RIGHT;
        var check_left = directions.RIGHT_TO_LEFT | directions.DOWN_RIGHT_TO_UP_LEFT | directions.UP_RIGHT_TO_DOWN_LEFT;
        var check_bottom = directions.UP_TO_DOWN | directions.UP_LEFT_TO_DOWN_RIGHT | directions.UP_RIGHT_TO_DOWN_LEFT;
        var check_top = directions.DOWN_TO_UP | directions.DOWN_RIGHT_TO_UP_LEFT | directions.DOWN_LEFT_TO_UP_RIGHT;

        if(direction & check_right){
            if(word.length + col > grid[row].length) return false;
        }
        if(direction & check_left){
            if(col - word.length < 0) return false;
        }
        if(direction & check_bottom){
            if(word.length + row > grid.length) return false;
        }
        if(direction & check_top){
            if(row - word.length < 0) return false;
        }

        // check intersections
        var r = row, c = col;
        var step = step_functions[direction];
        for(var i = 0; i < word.length; i++){
            if(grid[r][c].letter != null && grid[r][c].letter != word.charAt(i)) return false;
            var new_row_col = step(r, c);
            r = new_row_col[0];
            c = new_row_col[1];
        }

        // all clear, so place the word on the grid
        var r = row, c = col;
        for(var i = 0; i < word.length; i++){
            var cell = grid[r][c];
            cell.letter = word.charAt(i);
            cell.addWordInDirection(index, direction);
            var new_row_col = step(r, c);
            r = new_row_col[0];
            c = new_row_col[1];
        }

        return true;
    }

    // try to add a word to the grid at some random place, in a random direction
    // returns the {row, col, direction} of the placed word, or false if it can't be done
    var addWordToGrid = function(grid, index, allowed_directions){
        // pick a random starting place;
        var start_r = randInRange(0, grid.length - 1);
        var start_c = randInRange(0, grid[start_r].length - 1);
        // loop around the entire grid, and attempt to place the word
        for(var r = start_r; r < grid.length + start_r; r++){
            var r0 = r % grid.length;
            for(var c = start_c; c < grid[r0].length + start_c; c++){
                var c0 = c % grid[r0].length;
                shuffle(allowed_directions);
                for(var i = 0; i < allowed_directions.length; i++){
                    if(placeWordAt(grid, index, r0, c0, allowed_directions[i])){
                        return {row: r0, col: c0, direction: allowed_directions[i]};
                    }
                }
            }
        }
        return false;
    }

    // determine if there is a badword starting at row, col
    // returns {word, direction} of the badword, or false
    // Note: If there are multiple badwords starting at row, col, only the
    // first one found is returned
    var hasBadWordStartingAt = function(grid, row, col){
        var cell = grid[row][col];
        if(cell.letter == null) return false; 
        var start_node = trie.step(cell.letter);

        // try every direction
        for(var k in step_functions){
            var step = step_functions[k];
            var node = start_node;
            var r = row, c = col;
            var badword = "";
            // keep track of all the word_indices we've stepped on
            // and how many times we've stepped on it
            var indices = {};
            while(node != 0){
                // record what words we've stepped on
                for(var word_index in grid[r][c].words){
                    if(word_index in indices){
                        indices[word_index] += 1;
                    } else {
                        indices[word_index] = 1;
                    }
                }
                badword += grid[r][c].letter;

                // hit a badword
                if(node.is_word){
                    // determine if the badword is embedded in another word
                    // like "ass" in "assess"
                    var is_substr_of_real_word = false;
                    // if every letter we stepped on was part of a real word,
                    // then it is not a badword
                    for(var word_index in indices){
                        if(indices[word_index] == badword.length) {
                            is_substr_of_real_word = true;
                            break;
                        }
                    }

                    if(!is_substr_of_real_word) {
                        return {word: badword, direction: k}
                    }
                }

                // take a step
                var new_row_col = step(r, c);
                r = new_row_col[0];
                c = new_row_col[1];
                // hit the edge of the grid, no badword in this direction
                if(r == grid.length || r < 0) break;
                if(c == grid[row].length || c < 0) break;

                node = trie.step(grid[r][c].letter, node);
            }
        }

        return false;
    }

    // returns an array of {row, col, word, direction} for all the badwords in
    // the grid (if return_all is true).  Or the first {row, col, word, direction}
    // of the badword. Or false if there is no badword found
    var hasBadWords = function(grid, return_all){
        var all = [];
        var has_bad_word = false;
        for(var r = 0; r < grid.length; r++){
            for(var c = 0; c < grid[r].length; c++){
                // walk along until we see a char
                if(grid[r][c].letter == null) continue;
                var bad_word = hasBadWordStartingAt(grid, r, c);
                if(bad_word){
                    has_bad_word = true;
                    bad_word.row = r;
                    bad_word.col = c;
                    if(return_all){
                        all.push(bad_word);
                    } else {
                        return bad_word;
                    }
                }
            }
        }

        return (return_all && has_bad_word) ? all : false;
    }

    // removes a word from the grid starting at row, col, in direction
    var removeWordFromGrid = function(grid, index, row, col, direction){
        var r = row, c = col; 
        var word = words[index];
        var step = step_functions[direction];
        for(var i = 0; i < word.length; i++){
            grid[r][c].removeWordInDirection(index, direction);
            // take a step
            var new_row_col = step(r, c);
            r = new_row_col[0];
            c = new_row_col[1];
        }
    }

    // replace all possible characters in a badword with new random ones
    var replaceBadWordStartingAt = function(grid, badword, row, col, direction){
        var r = row, c = col; 
        var step = step_functions[direction];
        for(var i = 0; i < badword.length; i++){
            // only replace the letter if it is not part of a badword
            if(!grid[r][c].is_part_of_word){
                grid[r][c].letter = randomLetter();
            }

            // take a step
            var new_row_col = step(r, c);
            r = new_row_col[0];
            c = new_row_col[1];
        }
    }

    this.missingWords = function(){ return failed }

    this.generate = function(rows, cols, allowed_directions){
        // init grid
        var grid = new Array(rows);
        for(var r = 0; r < rows; r++){
            grid[r] = new Array(cols);
            for(var c = 0; c < grid[r].length; c++){
                grid[r][c] = new Cell(null);
            }
        }

        failed = [];
        // add the words to the grid
        var tries = 10;
        for(var i = 0; i < words.length; i++){
            for(var j = 0; j < tries; j++){
                var position = addWordToGrid(grid, i, allowed_directions);
                if(!position) break;
                if(hasBadWords(grid)){
                    removeWordFromGrid(grid, i, position.row, position.col, position.direction);
                } else {
                    break;
                }
            }

            // could not place word
            if(!position){
                failed.push(i);
            }
        }

        // copy random letters into grid
        for(var r = 0; r < rows; r++){
            for(var c = 0; c < cols; c++){
                if(grid[r][c].letter == null){
                    grid[r][c].letter = randomLetter();
                }
            }
        }

        // check the grid for badwords and attempt to fix it up if you can
        var return_all = true
        for(var j = 0; j < tries; j++){
            var badwords = hasBadWords(grid, return_all);
            // how lucky! no badwords
            if(badwords == false) break;
            // replace the badwords with new letters
            for(var i = 0; i < badwords.length; i++){
                var bad = badwords[i];
                replaceBadWordStartingAt(grid, bad.word, bad.row, bad.col, bad.direction)
            }
        }

        if(j == tries){
            // there is a badword in the grid
            // do nothing...or warn the user
        }

        return grid;
    }

    // just a little utility to init a grid based on a string (I used it to
    // find badwords in other people's word searchs!)
    this.findBadWordsInWordSearchString = function(str){
        var str = str.replace(/[ \t]/g, "");
        var lines = $.trim(str).split("\n");
        var grid = []
        for(var i = 0; i < lines.length; i++){
            var chars = lines[i];
            var row = []
            for(var j = 0; j < chars.length; j++){
                row.push(new Cell(chars[j]));
            }
            grid.push(row)
        }
        return hasBadWords(grid, true);
    }

    // make a pretty little word grid
    this.htmlFor = function(grid, highlight_answers){
        var html = []
        for(var r = 0; r < grid.length; r++){
            for(var c = 0; c < grid[r].length; c++){
                if(grid[r][c].is_part_of_word && highlight_answers){
                    html.push("<strong>" + grid[r][c].letter + "</strong>")
                } else {
                    html.push(grid[r][c].letter ? grid[r][c].letter : "&nbsp;");
                }
            }
            html.push("<br />");
        }
        return html.join("");
    }
}
