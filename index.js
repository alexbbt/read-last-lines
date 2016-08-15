const fs = require('fs');

module.exports = {

	/**
	 * Read in the last `n` lines of a file
	 * @param  {string}   file         direct or relative path to file
	 * @param  {int}   		maxLineCount max number of lines to read in.
	 * @return {promise}               new Promise, resolved with lines or rejected with error message
	 */

	read: function(file, maxLineCount) {
		return new Promise((resolve, reject) => {
	    fs.stat(file, function(err, stat) {
	      fs.open(file, 'r', function(err, fd) {
	        if(err) reject(err);
	        var i = 0;
	        var lines = '';
	        lineCount = 0;
	        var readPrevious = function(buf) {
	          fs.read(fd, buf, 0, buf.length, stat.size-buf.length-i, function(err, bytesRead, buffer) {
	        		if(err) reject(err);
	            lines = String.fromCharCode(buffer[0]) + lines;
	            if (buffer[0] === 0x0a) { //0x0a == '\n'
	              if (lineCount > maxLineCount) {
	                if (lines.length > stat.size) {
	                  lines = lines.substring(lines.length - stat.size);
	                }
	                return resolve(lines);
	              } else {
	                lineCount++;
	              }
	            }
	            i++;
	            readPrevious(new Buffer(1));
	          });
	        }
	        readPrevious(new Buffer(1));
	      });
	    });
	  })
  }
}