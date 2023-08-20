
//<!--<script src = "index.js" ></script> -->
//-----------------------------------------------------------

//buttons, background, text:
document.getElementsByTagName("body")[0].style.cursor = "blue.png, auto";


function imBlue(){
    //pinpoint box class
    document.querySelector('.box').style.color = 'blue';

    var dab = document.getElementById("dab");
    dab.style.color = 'blue'
    dab.innerHTML = "DABADEE DABADI";
    document.body.style.backgroundImage = "url('back1.gif')";
}

// increase text size
function bigger(id, pxInc){
    txt = document.getElementById(id); //grab button
    style = window.getComputedStyle(txt, null).getPropertyValue('font-size'); //parse button
    sizeNow = parseFloat(style); //current size
    txt.style.fontSize = (sizeNow + pxInc) + 'px'; //inc
}
//gif:
document.getElementById( 'naomi' ).style.cursor = "pointer";
document.getElementById( 'naomi' ).style.position = "absolute";
document.getElementById( 'naomi' ).style.top = "110px";
document.getElementById( 'naomi' ).style.left = "900px";


//-----------------------------------------------------------------------
//ESTUDO:

// <!-- <h1>Hello World</h1> -->

//coment
console.log( 'Hello World' ); //this is a statement

//print on console:
let nome = "Anna"
console.log( nome ); 

//COnstants:
const FavoriteColor = "Blue";

//primitive types:
let namee = "anna";
let age = "22"; // n tem diferenca entre float e inteiro
let pretty = true;
let memory = undefined;
let senseOfDirection = null; //clear value of variable


typeof nome


// declare person object:
let person = 
{
    namee: "anna",
    age: 22
};

console.log( person );

//dot notation:
person.namee = "Agmo";
//bracket notation:
person["namee"] = "Anna";

//Arrays:
let selectedColors = ["red", "blue"];
selectedColors[2] = "green"; //append
selectedColors[3] = "#0049FD";

console.log(selectedColors);
console.log(selectedColors[0]);
//console.log(selectedColors.) varios atributos
console.log(selectedColors.length);


//functions
function greet(Nome, idade) {
    console.log("Hello " + Nome + idade);
}

greet("Anna", 22);


function square(number) 
{
    return number * number
}

let number = square(2);
console.log(number);

//------------------------------------
// COISAS Q EU TIREI:


// NO BODY DO CSS:

  /*<div id = "bingbing" class="ascii-art" >    
      ╭――――――――――――――――――╮
      │                  │
      │    BING BING     │
      │                  │
      ╰―――――――――――――――   ╯
                       \|
    </div>
    */
     /*<img id="bing" src="bing.gif" onclick="HTMLredirect();">*/


// NO JS:
//document.getElementById( 'bingbing' ).style.position = "absolute";