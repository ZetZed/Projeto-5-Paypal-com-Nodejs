const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");


// View engine
app.set('view engine', 'ejs');

//Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//PayPal
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AeILOCiQsffzz7pSmKWAcZy3UQf7rKUQImIi4v4HXXp_ZyY7ZT6dcEu21wSlSm-4xTZs68Lab_KvY_Il',
    'client_secret': 'EF5Oz8cWLlIhzwNQLnixgkQShf_9zzTdBG9SFwOdqrLLav794YSHpfKmmftaVuI7JPwxGOE8hw227bRg'
});

//ROTAS

//ROTA 1 - Index
app.get("/", (req, res) => {

    res.render("index");

});

//ROTA 2 - Integração do Paypal 
app.post("/comprar", (req, res) => {


    var email = req.body.email;
    var id = req.body.id;

    var { name, price, amount } = req.body;

    var total = price * amount;

    console.log(total);

    var pagamento = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": `http://localhost:45567/final?email=${email}&id=${id}&total=${total}`, //ROTA 3
            "cancel_url": "http://cancel.url"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": name,
                    "sku": name,
                    "price": price,
                    "currency": "BRL",
                    "quantity": amount
                }]
            },
            "amount": {
                "currency": "BRL",
                "total": total
            },
            "description": "Esta é a melhor bola de todas."
        }]
    };

    //Criando Pagamento
    paypal.payment.create(pagamento, (error, payment) => {
        if (error) {
            console.log(error);
        } else {

            for (var i = 0; i < payment.links.length; i++) {
                var p = payment.links[i];
                if (p.rel === 'approval_url') { // Vai percorrer por todos os links e procurar o que tiver com 'rel' = 'approval_url'
                    res.redirect(p.href); //Redireciona para link de pagamento do paypal...
                }
            }

            //res.json(payment);
        }
    })

});

//ROTA 3 - URL de Retorno
app.get("/final", (req, res) => {
    var payerId = req.query.PayerID;
    var paymentId = req.query.paymentId;

    var emailDoCliente = req.query.email; //Pega da url o 'email' e passa para a variavel...
    var idDoCliente = req.query.id;
    var total = req.query.total;


    console.log(emailDoCliente);
    console.log(idDoCliente);

    var final = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "BRL",
                "total": total
            }
        }]
    }

    paypal.payment.execute(paymentId, final, (error, payment) => {
        if (error) {
            console.log(error);
        } else {

            //ClienteTabela.Id(idDoCliente).AddPagamento(pagamento);


            res.json(payment);
        }
    })
});


//CRIAÇÃO DE PLANOS


app.listen(45567, () => {
    console.log("Running!")
})