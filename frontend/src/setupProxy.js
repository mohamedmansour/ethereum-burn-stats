let price = 1900.12

module.exports = function(app) {


  app.get('/price.json',(req, res) => {
    price = price + 5
    res.json({"data":{"base":"ETH","currency":"USD","amount": price.toString() }})
  });
};