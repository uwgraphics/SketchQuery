<?php
//Store queries once we've made them.
//This allows us to 
// a) collect data on what kind of queries people make.
// b) link to specific results.

//Can talk to either a database or a file. If the former, set fileMode to false, and change the variables in db.php to your mysql configuration.
 
include_once("db.php");
date_default_timezone_set(UTC);
$date = date('Y-m-d H:i',time());
$query = $_POST['query'];
$mode = $_POST['mode'];
$comments = $_POST['hits'];
$dataset = $_POST['dataset'];

if($fileMode){
  file_put_contents("queries.tsv","$date	$query	$mode	$hits	$dataset\n",FILE_APPEND);
}
else{
  $fullquery = "INSERT INTO $dbname VALUES ('$date','$query',$mode,$hits,$dataset);";
  try{
	$db = mysql_connect($server,$user,$pass);
	if(!$db){
		throw new Exception('Error connecting to mysql');
	}
	$result = mysql_query($fullquery);
	if($result){
		throw new Exception('Error executing query');
	}
	mysql_close($db);
  }
  catch(Exception $e){
	echo mysql_error();
  } 
}

echo "Finished";
?>

