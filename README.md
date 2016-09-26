# SketchQuery
A information associated with our [paper](paper/VAST2016.pdf) for [VAST 2016](http://ieeevis.org/),  [Semantics of Sketch: A Visual Query System for Time Series Data](http://graphics.cs.wisc.edu/Papers/2016/CG16/).

Data from our qualitative study is in the [Evaluation](evaluation) folder.

The following information is for our tool, which allows users to sketch a query on a height field, establish invariants (properties of the sketch or data they find unimportant) and then query a set of time series data.

Released under a CRAPL license, see LICENSE file.
Contact: mcorrell on github, or correll_at_uw.edu

OUTLINE
#
	A. Organization
	
	B. Loading Datasets
	
	C. Drawing UI
	
		1. Sketching
		2. Exemplar Queries

	D. Querying UI

		1. Invariants
		2. MSE
		3. Hough
		4. DTW

	E. Datasets

A. Organization
---------------
The prototype is divided into three main areas:

The left hand side is the “small multiples pane,” containing a scrollable list all the time series in the current dataset. After a query is executed, the time series are SORTED by their closeness to your query, and colored by their relative closeness. That is, green series within the top 1/9th closest queries by value of match strength, and red are in the bottom 1/9th closest queries. 

The top middle region is the “results pane,” showing the top closest results in detail.

The bottom middle region is the “sketch pane,” containing the sketch canvas as well as UI options for drawing and refining queries.

B. Loading DataSets
-------------------

Datasets are assumed to be csv files in the datasets directory in the main SketchQuery folder. The csvs should have a header line, and needs a minimum of three specific columns (in any order; extraneous columns will be ignored).
* A NAME column: The name of a particular time series.
* A TIME column: The temporal location of an observation
* A VALUE column: The value of the time series at this time point.

There should be one row per time series, per time point.
An example, from the Google NGrams dataset:

	word,year,freq
	
	#,1800,0.00000767

The NAME, TIME, and VALUE columns can have any name. By default, the prototype assumes they are called “word”, “date”, and “freq.” 
 NAME is presumed to be a string, TIME a d3 parse-able date, and VALUE a floating point number. 

To specify new names or new csvs to the prototype, include them as html get variables. e.g., to use the stock dataset,
http://HOST/PATH/main.php?data=stocks2&time=date&value=price&name=symbol

C. Drawing UI
-------------
### 1: Sketching
The central, pure white area of the prototype is the drawing canvas. Hold down the mouse, or stylus, or drag your fingers in a touch display, to interact with the canvas. A red line at the bottom of the canvas indicates there is no data at that location: otherwise, the values are presumed to be zero.
		In the central pane of the display are four buttons:
			Magnifying  glass: execute a query with the current sketch, and the current settings.
			Red x in circle: Erase the entire sketch.
			Pencil: Toggle drawmode: strokes will add to the sketch.
			Eraser: Toggle erasemode: strokes will subtract from the sketch, creating areas with no value (rather than zero).

Your sketch represents a “visual query” - once you click the magnifying glass button, the prototype will search through the current dataset to find the time series  that most closely resembles what you have sketched (for some definition of “close,” see below). 

Below the buttons for controlling the drawing are a series of dropdown and check boxes. These control how querying is defined (that is, what counts as “similar” or “dissimilar” time series to your sketches). The first row determines how results are presented. Both how many results to place in the results pane (between 1-10), and whether these results are presented one on top of each other, or all superimposed into the same chart.

### 2: Exemplar Queries
Doubleclicking (or doubletapping, in touch displays) on the small multiples pane will transfer a query into the sketch pane, allowing you to use it as a “query by example.” You can draw over this query at will, or erase portions you think are irrelevant. 

D. Querying UI
--------------
### 1: Invariants
The next bottom row of drawing UI controls what matching ALGORITHM to use (see below), and what INVARIANTS should be active. Not every algorithm supports every invariant: by switching algorithms, some checkboxes may be disabled or reset. Please see the paper for more details about invariants. Essentially, invariants are properties of your sketch or of the dataset that you consider irrelevant for calculating matches. 
			X Position: If this is unchecked, a match must occur exactly where you have drawn the sketch. e.g., if you drew your sketch in the far left of the canvas, then matches must occur very early, temporally. If it is checked, then the prototype will perform partial matching, shifting the query along the temporal axis until it finds the best match. The results pane will then present a colored region showing exactly where it found this match. These are colored by their absolute closeness; i.e., a series in the results panel is only bright green if it is very close to your query by some objective measure (for instance very close to 0 MSE), rather than just being relatively close with respect to all the matches in the dataset.
			Y Position: If this is checked, then the prototype will, in effect shift your query up and down on the y axis until it finds the best match. Currently, only Hough voting allows this option.
			Noise: If this is checked, the prototype will smooth all of the time series in the dataset before calculating matches: a good way of eliminating outliers or spikes.
			Amplitude: If this is checked, then any scalar multiple of your query will count as a match, with a slight weighting towards matches with the same amplitude as your query. Only Hough voting currently supports this invariant. 
			Warp: If this is checked, this allows your query to be non-linearly squeezed and stretched in the temporal dimension. These squeezing comes at a cost, so the best matches are the ones with the “cheapest” warps. Currently only DTW supports this invariant.

### 2: MSE

Mean Squared Error (MSE) is a naive way of calculating absolute value differences between a query and a target. It adds up the differences in value from the target at each point. Series that are numerically very similar will match if you use MSE. It is also the fastest of the available matching algorithms, although may still be slow if you are conducting partial matching (you have checked the X Position invariant), as it must determine the cheapest x position by naively shifting your sketch around. The shorter the sketch, the more places it has to try.

### 3: Hough

The Hough Transform (Hough) is an algorithm from computer vision for locating shapes and patterns. Essentially, each point on the sketch will “vote” on where it believes the center of the best match to be, given its current location when aligned to a particular time series. The place with the most votes is the best match. This means that outliers or sharp features in the sketch may be “drowned out” by the votes of other portions of the sketch. The longer the sketch, the more voting has to be done.

### 4: DTW

Dynamic Time Warping (DTW) finds the cheapest non-linear time warp from your sketch to a particular time series. This is very useful if there are characteristic patterns you are looking for, but these patterns may be arbitrarily separated or compressed in time. An example is a crash in stock price: a stock might crash over a matter of hours, or over a matter of days. By drawing a linear decrease, and selecting DTW, all of these crashes could be located. The longer the sketch, the more complicated the warp that must be calculated.

E. Datasets
-----------
We have included a number of default datasets on github pages. Somes ones to try:

* [Google n grams](uwgraphics.github.io/SketchQuery) (default): The top 1000 most popular words in the google books corpus, with frequency information from 1800 onward.
* [Stocks](uwgraphics.github.io/SketchQuery/?data=stocks2&time=date&value=price&name=symbol): Sample stock information for a period of one year, August 2009-2010.
* [U.S. Government Agencies](http://uwgraphics.github.io/SketchQuery/?data=budget&name=agency&time=year&value=budget): The yearly budget of every agency of the U.S. government, 1976-2020(projected).
