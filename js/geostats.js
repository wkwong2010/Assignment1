/**
* geostats() is a tiny and standalone javascript library for classification 
* Project page - https://github.com/simogeo/geostats
* Copyright (c) 2011 Simon Georget, http://www.empreinte-urbaine.eu
* Licensed under the MIT license
*/

var isInt = function(n) {
   return typeof n === 'number' && parseFloat(n) == parseInt(n, 10) && !isNaN(n);
} // 6 characters

var _t = function(str) {
	return str;
};

var inArray = function(needle, haystack) {
    for(var i = 0; i < haystack.length; i++) {
        if(haystack[i] == needle) return true;
    }
    return false;
};

var geostats = function(a) {

	this.objectId = '';
	this.separator = ' - ';
	this.legendSeparator = this.separator;
	this.method  = '';
	this.precision = 0;
	this.precisionflag = 'auto';
	this.roundlength 	= 2; // Number of decimals, round values
	this.is_uniqueValues = false;
	this.debug =  false;
	
	this.bounds  = Array();
	this.ranges  = Array();
	this.inner_ranges  = null;
	this.colors  = Array();
	this.counter = Array();
	
	// statistics information
	this.stat_sorted	= null;
	this.stat_mean 		= null;
	this.stat_median 	= null;
	this.stat_sum 		= null;
	this.stat_max 		= null;
	this.stat_min 		= null;
	this.stat_pop 		= null;
	this.stat_variance	= null;
	this.stat_stddev	= null;
	this.stat_cov		= null;

	
	/**
	 * logging method
	 */
	this.log = function(msg) {
	
		if(this.debug == true)
			console.log(this.objectID + "(object id) :: " + msg);
		
	};
	
	/**
	 * Set bounds
	 */
	this.setBounds = function(a) {
		
		this.log('Setting bounds (' + a.length + ') : ' + a.join());
	
		this.bounds = Array() // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))
		
		this.bounds = a;
		//this.bounds = this.decimalFormat(a);
		
	};
	
	/**
	 * Set a new serie
	 */
	this.setSerie = function(a) {
		
		this.log('Setting serie (' + a.length + ') : ' + a.join());
	
		this.serie = Array() // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))
		this.serie = a;
		this.setPrecision();
		
	};
	
	/**
	 * Set colors
	 */
	this.setColors = function(colors) {
		
		this.log('Setting color ramp (' + colors.length + ') : '  + colors.join());
		
		this.colors = colors;
		
	};
	
	/**
	 * Get feature count
	 * With bounds array(0, 0.75, 1.5, 2.25, 3); 
	 * should populate this.counter with 5 keys
	 * and increment counters for each key
	 */
	this.doCount = function() {

		if (this._nodata())
			return;
		

		var tmp = this.sorted();
		
		this.counter[i]= new Array();
		
		// we init counter with 0 value
		for(i = 0; i < this.bounds.length; i++) {
			this.counter[i]= 0;
		}
		
		for(j=0; j < tmp.length; j++) {
			
			// get current class for value to increment the counter
			var cclass = this.getClass(tmp[j]);
			this.counter[cclass]++;

		}

	};
	
	/**
	 * Set decimal precision according to user input
	 * or automatcally determined according
	 * to the given serie.
	 */
	this.setPrecision = function(decimals) {
		
		// only when called from user
		if(typeof decimals !== "undefined") {
			this.precisionflag = 'manual';
			this.precision = decimals;
		}
		
		// we calculate the maximal decimal length on given serie
		if(this.precisionflag == 'auto') {
			
			for (var i = 0; i < this.serie.length; i++) {
				
				// check if the given value is a number and a float
				if (!isNaN((this.serie[i]+"")) && (this.serie[i]+"").toString().indexOf('.') != -1) {
					var precision = (this.serie[i] + "").split(".")[1].length;
				} else {
					var precision = 0;
				}
				
				if(precision > this.precision) {
					this.precision = precision;
				}
				
			}
			
		}

		this.log('Calling setPrecision(). Mode : ' + this.precisionflag + ' - Decimals : '+ this.precision);
		
		this.serie = this.decimalFormat(this.serie);
		
	};
	
	/**
	 * Format array numbers regarding to precision
	 */
	this.decimalFormat = function(a) {
		
		var b = new Array();
		
		for (var i = 0; i < a.length; i++) {
			// check if the given value is a number
			if (!isNaN(a[i]+"")) {
				b[i] = parseFloat(a[i]).toFixed(this.precision);
			} else {
				b[i] = a[i];
			}
			
		}
		
		return b;
	}
	
	/**
	 * Transform a bounds array to a range array the following array : array(0,
	 * 0.75, 1.5, 2.25, 3); becomes : array('0-0.75', '0.75-1.5', '1.5-2.25',
	 * '2.25-3');
	 */
	this.setRanges = function() {
	
		this.ranges = Array(); // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))
		
		for (i = 0; i < (this.bounds.length - 1); i++) {
			this.ranges[i] = this.bounds[i] + this.separator + this.bounds[i + 1];
		}
	};

	/** return min value */
	this.min = function() {
		
		if (this._nodata())
			return;
		
		this.stat_min = Math.min.apply(null, this.serie);
		
		return this.stat_min;
	};

	/** return max value */
	this.max = function() {
		
		this.stat_max = Math.max.apply(null, this.serie);
		
		return this.stat_max;
	};

	/** return sum value */
	this.sum = function() {
		
		if (this._nodata())
			return;
		
		if (this.stat_sum  == null) {
			
			this.stat_sum = 0;
			for (i = 0; i < this.pop(); i++) {
				this.stat_sum += this.serie[i];
			}
			
		}
		
		return this.stat_sum;
	};

	/** return population number */
	this.pop = function() {
		
		if (this._nodata())
			return;
		
		if (this.stat_pop  == null) {
			
			this.stat_pop = this.serie.length;
			
		}
		
		return this.stat_pop;
	};

	/** return mean value */
	this.mean = function() {
		
		if (this._nodata())
			return;
		
		if (this.stat_mean  == null) {
			
			this.stat_mean = this.sum() / this.pop();
			
		}
		
		return this.stat_mean;
	};

	/** return median value */
	this.median = function() {
		
		if (this._nodata())
			return;
		
		if (this.stat_median  == null) {
			
			this.stat_median = 0;
			var tmp = this.sorted();
	
			if (tmp.length % 2) {
				this.stat_median = tmp[(Math.ceil(tmp.length / 2) - 1)];
			} else {
				this.stat_median = (tmp[(tmp.length / 2) - 1] + tmp[(tmp.length / 2)]) / 2;
			}
			
		}
		
		return this.stat_median;
	};

	/** return variance value */
	this.variance = function() {
		
		round = (typeof round === "undefined") ? true : false;
		
		if (this._nodata())
			return;
		
		if (this.stat_variance  == null) {

			var tmp = 0;
			for (var i = 0; i < this.pop(); i++) {
				tmp += Math.pow( (this.serie[i] - this.mean()), 2 );
			}

			this.stat_variance =  tmp /	this.pop();
			
			if(round == true) {
				this.stat_variance = Math.round(this.stat_variance * Math.pow(10,this.roundlength) )/ Math.pow(10,this.roundlength);
			}
			
		}
		
		return this.stat_variance;
	};
	
	/** return standard deviation value */
	this.stddev = function(round) {
		
		round = (typeof round === "undefined") ? true : false;
		
		if (this._nodata())
			return;
		
		if (this.stat_stddev  == null) {
			
			this.stat_stddev = Math.sqrt(this.variance());
			
			if(round == true) {
				this.stat_stddev = Math.round(this.stat_stddev * Math.pow(10,this.roundlength) )/ Math.pow(10,this.roundlength);
			}
			
		}
		
		return this.stat_stddev;
	};
	
	/** coefficient of variation - measure of dispersion */
	this.cov = function(round) {
		
		round = (typeof round === "undefined") ? true : false;
		
		if (this._nodata())
			return;
		
		if (this.stat_cov  == null) {
			
			this.stat_cov = this.stddev() / this.mean();
			
			if(round == true) {
				this.stat_cov = Math.round(this.stat_cov * Math.pow(10,this.roundlength) )/ Math.pow(10,this.roundlength);
			}
			
		}
		
		return this.stat_cov;
	};
	
	/** data test */
	this._nodata = function() {
		if (this.serie.length == 0) {
			
			alert("Error. You should first enter a serie!");
			return 1;
		} else
			return 0;
		
	};

	/** return sorted values (as array) */
	this.sorted = function() {
		
		if (this.stat_sorted  == null) {
			
			if(this.is_uniqueValues == false) {
				this.stat_sorted = this.serie.sort(function(a, b) {
					return a - b;
				});
			} else {
				this.stat_sorted = this.serie.sort(function(a,b){
					var nameA=a.toString().toLowerCase(), nameB=b.toString().toLowerCase();
				    if(nameA < nameB) return -1;
				    if(nameA > nameB) return 1;
				    return 0;
				})
			}
		}
		
		return this.stat_sorted;
		
	};

	/** return all info */
	this.info = function() {
		
		if (this._nodata())
			return;
		
		var content = '';
		content += _t('Population') + ' : ' + this.pop() + ' - [' + _t('Min')
				+ ' : ' + this.min() + ' | ' + _t('Max') + ' : ' + this.max()
				+ ']' + "\n";
		content += _t('Mean') + ' : ' + this.mean() + ' - ' + _t('Median')	+ ' : ' + this.median() + "\n";
		content += _t('Variance') + ' : ' + this.variance() + ' - ' + _t('Standard deviation')	+ ' : ' + this.stddev()  
				+ ' - ' + _t('Coefficient of variation')	+ ' : ' + this.cov() + "\n";

		return content;
	};

	/**
	 * Equal intervals discretization Return an array with bounds : ie array(0,
	 * 0.75, 1.5, 2.25, 3);
	 */
	this.getEqInterval = function(nbClass) {

		if (this._nodata())
	        return;

	    this.method = _t('eq. intervals') + ' (' + nbClass + ' ' + _t('classes')
	            + ')';

	    var tmpMax = this.max();
	    var a = Array();
	    var val = this.min();
	    var interval = (tmpMax - this.min()) / nbClass;

	    for (i = 0; i <= nbClass; i++) {
	        a[i] = val;
	        val += interval;
	    }

	    //-> Fix last bound to Max of values
	    a[nbClass] = tmpMax;

	    this.setBounds(a);
	    this.setRanges();

	    return this.bounds;
	};
	

	/**
	 * Quantile discretization Return an array with bounds : ie array(0, 0.75,
	 * 1.5, 2.25, 3);
	 */
	this.getQuantile = function(nbClass) {

		if (this._nodata())
			return;

		this.method = _t('quantile') + ' (' + nbClass + ' ' + _t('classes') + ')';

		var a = Array();
		var tmp = this.sorted();

		var classSize = Math.round(this.pop() / nbClass);
		var step = classSize;
		var i = 0;

		// we set first value
		a[0] = tmp[0];

		for (i = 1; i < nbClass; i++) {
			a[i] = tmp[step];
			step += classSize;
		}
		// we set last value
		a.push(tmp[tmp.length - 1]);
		
		this.setBounds(a);
		this.setRanges();
		
		return this.bounds;

	};
	
	/**
	 * Credits : Doug Curl (javascript) and Daniel J Lewis (python implementation)
	 * http://www.arcgis.com/home/item.html?id=0b633ff2f40d412995b8be377211c47b
	 * http://danieljlewis.org/2010/06/07/jenks-natural-breaks-algorithm-in-python/
	 */
	this.getJenks = function(nbClass) {
	
		if (this._nodata())
			return;
		
		this.method = _t('Jenks') + ' (' + nbClass + ' ' + _t('classes') + ')';
		
		dataList = this.sorted();

		// now iterate through the datalist:
		// determine mat1 and mat2
		// really not sure how these 2 different arrays are set - the code for
		// each seems the same!
		// but the effect are 2 different arrays: mat1 and mat2
		var mat1 = []
		for ( var x = 0, xl = dataList.length + 1; x < xl; x++) {
			var temp = []
			for ( var j = 0, jl = nbClass + 1; j < jl; j++) {
				temp.push(0)
			}
			mat1.push(temp)
		}

		var mat2 = []
		for ( var i = 0, il = dataList.length + 1; i < il; i++) {
			var temp2 = []
			for ( var c = 0, cl = nbClass + 1; c < cl; c++) {
				temp2.push(0)
			}
			mat2.push(temp2)
		}

		// absolutely no idea what this does - best I can tell, it sets the 1st
		// group in the
		// mat1 and mat2 arrays to 1 and 0 respectively
		for ( var y = 1, yl = nbClass + 1; y < yl; y++) {
			mat1[0][y] = 1
			mat2[0][y] = 0
			for ( var t = 1, tl = dataList.length + 1; t < tl; t++) {
				mat2[t][y] = Infinity
			}
			var v = 0.0
		}

		// and this part - I'm a little clueless on - but it works
		// pretty sure it iterates across the entire dataset and compares each
		// value to
		// one another to and adjust the indices until you meet the rules:
		// minimum deviation
		// within a class and maximum separation between classes
		for ( var l = 2, ll = dataList.length + 1; l < ll; l++) {
			var s1 = 0.0
			var s2 = 0.0
			var w = 0.0
			for ( var m = 1, ml = l + 1; m < ml; m++) {
				var i3 = l - m + 1
				var val = parseFloat(dataList[i3 - 1])
				s2 += val * val
				s1 += val
				w += 1
				v = s2 - (s1 * s1) / w
				var i4 = i3 - 1
				if (i4 != 0) {
					for ( var p = 2, pl = nbClass + 1; p < pl; p++) {
						if (mat2[l][p] >= (v + mat2[i4][p - 1])) {
							mat1[l][p] = i3
							mat2[l][p] = v + mat2[i4][p - 1]
						}
					}
				}
			}
			mat1[l][1] = 1
			mat2[l][1] = v
		}

		var k = dataList.length
		var kclass = []

		// fill the kclass (classification) array with zeros:
		for (i = 0, il = nbClass + 1; i < il; i++) {
			kclass.push(0)
		}

		// this is the last number in the array:
		kclass[nbClass] = parseFloat(dataList[dataList.length - 1])
		// this is the first number - can set to zero, but want to set to lowest
		// to use for legend:
		kclass[0] = parseFloat(dataList[0])
		var countNum = nbClass
		while (countNum >= 2) {
			var id = parseInt((mat1[k][countNum]) - 2)
			kclass[countNum - 1] = dataList[id]
			k = parseInt((mat1[k][countNum] - 1))
			// spits out the rank and value of the break values:
			// console.log("id="+id,"rank = " + String(mat1[k][countNum]),"val =
			// " + String(dataList[id]))
			// count down:
			countNum -= 1
		}
		// check to see if the 0 and 1 in the array are the same - if so, set 0
		// to 0:
		if (kclass[0] == kclass[1]) {
			kclass[0] = 0
		}
		
		this.setBounds(kclass);
		this.setRanges();

		return this.bounds; //array of breaks
	}
	
	
	/**
	 * Quantile discretization Return an array with bounds : ie array(0, 0.75,
	 * 1.5, 2.25, 3);
	 */
	this.getUniqueValues = function() {

		if (this._nodata())
			return;

		this.method = _t('unique values');
		this.is_uniqueValues = true;
		
		var tmp = this.sorted(); // display in alphabetical order

		var a = Array();

		for (i = 0; i < this.pop(); i++) {
			if(!inArray (tmp[i], a))
				a.push(tmp[i]);
		}
		
		this.bounds = a;
		
		return a;

	};
	
	
	/**
	 * Return the class of a given value.
	 * For example value : 6
	 * and bounds array = (0, 4, 8, 12);
	 * Return 2
	 */
	this.getClass = function(value) {

		for(i = 0; i < this.bounds.length; i++) {
			
			
			if(this.is_uniqueValues == true) {
				if(value == this.bounds[i])
					return i;
			} else {
				// parseFloat() is necessary
				if(parseFloat(value) <= this.bounds[i + 1]) {
					return i;
				}
			}
		}
		
		return _t("Unable to get value's class.");
		
	};

	/**
	 * Return the ranges array : array('0-0.75', '0.75-1.5', '1.5-2.25',
	 * '2.25-3');
	 */
	this.getRanges = function() {
		
		return this.ranges;
		
	};

	/**
	 * Returns the number/index of this.ranges that value falls into
	 */
	this.getRangeNum = function(value) {
		
		var bounds, i;

		for (i = 0; i < this.ranges.length; i++) {
			bounds = this.ranges[i].split(/ - /);
			if (value <= parseFloat(bounds[1])) {
				return i;
			}
		}
	}
	
	/*
	 * Compute inner ranges based on serie. 
	 * Produce discontinous ranges used for legend - return an array similar to : 
	 * array('0.00-0.74', '0.98-1.52', '1.78-2.25', '2.99-3.14');
	 * If inner ranges already computed, return array values.
	 */
	this.getInnerRanges = function() {
		
		// if already computed, we return the result
		if(this.inner_ranges != null)
			return this.inner_ranges;
		
		// console.log("bounds : " + this.bounds.join());
		
		
		
		var a = new Array();
		var tmp = this.sorted();
		
		
		var cnt = 1; // bounds array counter
		
		for (i = 0; i < tmp.length; i++) {
			
			if(i == 0) var range_firstvalue = tmp[i]; // we init first range value
			
			if(parseFloat(tmp[i]) > parseFloat(this.bounds[cnt])) {
				
				a[cnt - 1] = '' + range_firstvalue + this.separator + tmp[i-1];
				
				var range_firstvalue =  tmp[i];
				
				cnt++;
			}
			
			// we reach the last range, we finally complete manually
			// and return the array
			if(cnt == (this.bounds.length - 1)) {
				// we set the last value
				a[cnt - 1] = '' + range_firstvalue + this.separator + tmp[tmp.length-1];
				
				this.inner_ranges = a;
				return this.inner_ranges;
			}
			
			

		}
		
	};
	
	this.getSortedlist = function() {
		
		return this.sorted().join(', ');
		
	};
	
	/**
	 * Return an html legend
	 * colors : specify an array of color (hexadecimal values)
	 * legend :  specify a text input for the legend. By default, just displays 'legend'
	 * counter : if not null, display counter value
	 * callback : if not null, callback function applied on legend boundaries
	 * mode : 	null, 'default', 'distinct', 'discontinuous' : 
	 * 			- if mode is null, will display legend as 'default mode'
	 * 			- 'default' : displays ranges like in ranges array, sample :  29.26 - 378.80 / 378.80 - 2762.25 /  2762.25 - 6884.84
	 * 			- 'distinct' : Add + 1 according to decimal precision to distinguish classes, sample :  29.26 - 378.80 / 378.81 - 2762.25 /  2762.26 - 6884.84 
	 * 			- 'discontinuous' : indicates the range of data actually falling in each class , sample :  29.26 - 225.43 / 852.12 - 2762.20 /  3001.25 - 6884.84 / not implemented yet
	 */
	this.getHtmlLegend = function(colors, legend, counter, callback, mode) {
		
		var cnt= '';
		
		if(colors != null) {
			ccolors = colors;
		}
		else {
			ccolors = this.colors;
		}
		
		if(legend != null) {
			lg = legend;
		}
		else {
			lg =  'Legend';
		}
		
		if(counter != null) {
			this.doCount();
			getcounter = true;
		}
		else {
			getcounter = false;
		}
		
		if(callback != null) {
			fn = callback;
		}
		else {
			fn = function(o) {return o;};
		}
		if(mode == null) {
			mode = 'default';
		}
		if(mode == 'discontinuous') {
			this.getInnerRanges();
		}
		
		
		if(ccolors.length < this.ranges.length) {
			alert(_t('The number of colors should fit the number of ranges. Exit!'));
			return;
		}
		
		var content  = '<div class="geostats-legend"><div class="geostats-legend-title">' + _t(lg) + '</div>';
		
		if(this.is_uniqueValues == false) {
			
			for (i = 0; i < (this.ranges.length); i++) {
				if(getcounter===true) {
					cnt = ' <span class="geostats-legend-counter">(' + this.counter[i] + ')</span>';
				}
				//console.log("Ranges : " + this.ranges[i]);
				
				// default mode 
				var tmp = this.ranges[i].split(this.separator);
					
				var start_value = parseFloat(tmp[0]).toFixed(this.precision);
				var end_value = parseFloat(tmp[1]).toFixed(this.precision);
					
				
				// if mode == 'distinct' and we are not working on the first value
				if(mode == 'distinct' && i != 0) {

					if(isInt(start_value)) {
						start_value = parseInt(start_value) + 1;
					} else {

						start_value = parseFloat(start_value) + (1 / Math.pow(10,this.precision));
						// strangely the formula above return sometimes long decimal values, 
						// the following instruction fix it
						start_value = parseFloat(start_value).toFixed(this.precision);
					}
				}
				
				// if mode == 'discontinuous'
				if(mode == 'discontinuous') {
					
					var tmp = this.inner_ranges[i].split(this.separator);
					// console.log("Ranges : " + this.inner_ranges[i]);
					
					var start_value = parseFloat(tmp[0]).toFixed(this.precision);
					var end_value = parseFloat(tmp[1]).toFixed(this.precision);
					
				}
				
				// we apply callback function
				var el = fn(start_value) + this.legendSeparator + fn(end_value);
					

				content += '<div><div class="geostats-legend-block" style="background-color:' + ccolors[i] + '"></div> ' + el + cnt + '</div>';
			}
			
		} else {
			
			// only if classification is done on unique values
			for (i = 0; i < (this.bounds.length); i++) {
				if(getcounter===true) {
					cnt = ' <span class="geostats-legend-counter">(' + this.counter[i] + ')</span>';
				}
				var el = fn(this.bounds[i]);
				content += '<div><div class="geostats-legend-block" style="background-color:' + ccolors[i] + '"></div> ' + el + cnt + '</div>';
			}
			
		}
		
		content += '</div>';
    
		return content;
	};

	
	
	// object constructor
	// At the end of script. If not setPrecision() method is not known
	
	// we create an object identifier for debugging
	this.objectID = new Date().getUTCMilliseconds();
	this.log('Creating new geostats object');
	
	if(typeof a !== 'undefined' && a.length > 0) {
		this.serie = a;
		this.setPrecision();
		this.log('Setting serie (' + a.length + ') : ' + a.join());
	} else {
		this.serie = Array();

	};

};