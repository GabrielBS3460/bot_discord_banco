const express = require("express");

function startKeepAlive() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.get("/", (req, res) => {
        res.send("🤖 O bot está online. O servidor de keep-alive está funcionando perfeitamente!");
    });

    app.listen(port, () => {
        console.log(`🌐 Servidor de keep-alive rodando na porta ${port}`);
    });
}

module.exports = startKeepAlive;
