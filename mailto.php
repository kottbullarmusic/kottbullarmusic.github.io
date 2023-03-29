
<?php
if(isset($_POST["email"])) {

$to = "koettbullar.music@gmail.com";
$subject = "Contact mail";
$from=$_POST["email"];
$msg=$_POST["msg"];
$name=$_POST["name"];
$headers = "From: $from";

mail($to,$subject,$msg,$headers);

    echo "Email successfully sent.";
    exit;
}
?>