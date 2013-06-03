$(document).ready(function(){
    $("#account").on('submit',function(){
        var all_answered =true;
        var nameArr = [];
        var filArr = [];
        $("input:radio").each(function(){
            var name = $(this).attr("name");
            nameArr.push(name);
            //console.log("nameArr : "+nameArr[0]);
            function eliminateDuplicates(arr) {
              var i,
                  len=arr.length,
                  out=[],
                  obj={};

              for (i=0;i<len;i++) {
                obj[arr[i]]=0;
              }
              for (i in obj) {
                out.push(i);
              }
              return out;
            }
            filArr= eliminateDuplicates(nameArr);
        });
        //console.log("filArr : "+filArr);
        for(i=0;i<filArr.length;i++){
            if (!$("input[name='"+filArr[i]+"']:checked").val()) {
                all_answered = false;
            }
        }
        if(!all_answered){
               alert('Something is not checked!');
        }
        console.log(all_answered);
        return all_answered;
    });
$('#myModal').modal('toggle');
});
