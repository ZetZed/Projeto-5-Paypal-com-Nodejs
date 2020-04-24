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


//ROTA 4 - CRIAÇÃO DE PLANOS
app.get("/create", (req, res) => {
    var plan = {
            "name": "Plano Prata",
            "description": "Um plano bem barato e muito bom!",
            "merchant_preferences": {
                "auto_bill_amount": "yes",
                "cancel_url": "http://www.cancel.com",
                "initial_fail_amount_action": "continue",
                "max_fail_attempts": "1",
                "return_url": "http://www.success.com",
                "setup_fee": {
                    "currency": "BRL",
                    "value": "0"
                }
            },

            "payment_definitions": [{
                    //Plano TRIAL - 7 dias com valor R$0,00
                    "amount": {
                        "currency": "BRL",
                        "value": "0"
                    },
                    "cycles": "7",
                    "frequency": "DAY",
                    "frequency_interval": "1",
                    "name": "Teste gratis",
                    "type": "TRIAL"
                },
                { //Plano Normal
                    "amount": {
                        "currency": "BRL",
                        "value": "24"
                    },
                    "cycles": "0", //Deixou 0 pq o tipo de plano esta como INFINITE..
                    "frequency": "MONTH",
                    "frequency_interval": "1",
                    "name": "Regular Prata",
                    "type": "REGULAR"

                }
            ],
            //Tipo do Plano
            "type": "INFINITE" //FIXE ou INFINITE - se plano for INFINITE não acaba enquanto cliente não cancelar..... 
        }
        //Para Criar mesmo o plano...
    paypal.billingPlan.create(plan, (erro, plan) => {
        if (erro) {
            console.log(erro)
        } else {
            console.log(plan);
            res.json(plan);
        }
    });
});

//ROTA 5 - LISTAGEM DE PLANOS..
app.get("/list", (req, res) => {
    paypal.billingPlan.list({ 'status': 'ACTIVE' }, (error, plans) => {
        if (error) {
            console.log(error)
        } else {
            res.json(plans);
        }
    })
});

//ROTA 6 - QUANDO FOR ATUALIZAR PLANOS
app.get("/active/:id", (req, res) => {
    var mudancas = [{
        "op": "replace",
        "path": "/",
        "value": {
            "state": "ACTIVE"
        }
    }]

    paypal.billingPlan.update(req.params.id, mudancas, (erro, result) => {
        if (erro) {
            console.log(erro)
        }
        res.send("Mudança feita!")

    })
});


//ROTA 7 - Assinatura do cliente no plano..
app.post("/sub", (req, res) => {
    var email = req.body.email;
    var idDoPlano = "P-6RH854333C992140VVJSBTSA";

    var isoDate = new Date(Date.now());
    isoDate.setSeconds(isoDate.getSeconds() + 4);
    isoDate.toISOString().slice(0, 19) + 'Z';

    var dadosDaAssinatura = {
            "name": "Assinatura do Plano Prata",
            "description": "Plano Prata Apenas R$25/mês",
            "start_date": isoDate,
            "payer": {
                "payment_method": "paypal"
            },
            "plan": {
                "id": idDoPlano
            },
            "override_merchant_preferences": {
                "return_url": `http://localhost:45567/subreturn?email=${email}`, //ROTA 8,
                "cancel_url": "https://example.com/cancel"
            }
        }
        //Pagamento da Assinatura
    paypal.billingAgreement.create(dadosDaAssinatura, (erro, assinatura) => {
        if (erro) {
            console.log(erro);
        } else {
            res.json(assinatura);
        }
    });
});


//ROTA 8 - Rota de retorno
app.get("/subreturn", (req, res) => {
    var email = req.query.email;
    var token = req.query.token;

    paypal.billingAgreement.execute(token, {}, (erro, assinatura) => {
        if (erro) {
            console.log(erro)
        } else {
            res.json(assinatura);
            //TabelaClientes.Find(email).AddPlan(assinatura.id);//Para salvar no plano do cliente o id da assinatura..
        }
    });


    /*
    if(pagamentoConcluido){
        TabelaDeClientes.Find(email).AddPlano(PlanoPrata)
    }*/

});


//ROTA 9 - LISTA/DETALHES DA ASSINATURA
app.get("/info/:id", (req, res) => {
    var id = req.params.id;

    paypal.billingAgreement.get(id, (erro, assinatura) => {
        if (erro) {
            console.log(erro);
        } else {
            res.json(assinatura);
        }
    })
});

//ROTA 10 - Cancelar Assinatura (precisa saber id da Assinatura)
app.get("/cancel/:id", (req, res) => {
    var id = req.params.id;

    paypal.billingAgreement.cancel(id, { "note": "O cliente pediu para cancelar!" }, (erro, response) => {
        if (erro) {
            console.log(erro);
        } else {
            res.send("Assinatura cancelada!");
        }
    })
});


//SERVIDOR
app.listen(45567, () => {
    console.log("Running!")
})