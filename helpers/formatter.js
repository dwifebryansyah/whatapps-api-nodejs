const phoneNumberFormatter = function(number){
    // 1.Menghilangkan karakter selain angka misal 0824-3213 menjadi 08243213
    let formatted = number.replace(/\D/g,'');

    // 2.menghilangkan angka 0 didepan
    if(formatted.startsWith('0')){
        formatted = '62' + formatted.substr(1);
    }

    // menambahkan @c.us
    if(!formatted.endsWith('@c.us')){
        formatted += '@c.us';
    }

    return formatted;
}

module.exports = {
    phoneNumberFormatter
}