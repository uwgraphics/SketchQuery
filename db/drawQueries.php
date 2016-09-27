<html>
<meta charset="utf-8" />
<head>
<script src="//d3js.org/d3.v3.min.js" charset="utf-8"></script>
</head>

<body>
<table></table>
</body>

<script>
var x = d3.scale.linear().range([0,250]);
var y = d3.scale.linear().domain([0,150]).range([50,0]);
var rows;

d3.tsv("./queries.tsv", function(error, data){
	data.forEach(function(d){
		d.x = x;
		d.query = d.query.split(",");
		d.x.domain([0,d.query.length]);
	});
	rows =d3.select("table").selectAll("tr").data(data).enter()
		.append("tr");

	rows.append("td").append("svg")
		.attr("width",250)
		.attr("height",50)
		.append("g")
		.append("path")
			.attr("d", function(queryD){
				return d3.svg.area()
					.x(function(d,i){ return queryD.x(i);})
					.y1(function(d){ return y(d);})
					.y0(50)
					(queryD.query);
			});
	
							
	rows.append("td").text(function(d,i){ return "Query "+i+": "+d.Hits;});
	
	//console.log(data);
});
 
</script>

</html>
