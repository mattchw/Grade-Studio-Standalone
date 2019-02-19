$(document).ready(function () {
  $('#submitBtn').click(function () {
    $.post('http://localhost:3000/uploadfile', $('#sendFile').serialize())
  })
})
