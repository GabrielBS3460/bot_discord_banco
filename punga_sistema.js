// punga_sistema.js

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function diversos() {
    const r = rand(1, 100);
    if (r <= 10) return "Alaude élfico";
    if (r <= 19) return "Algemas";
    if (r <= 28) return "Caixa de voz";
    if (r <= 37) return "Coleção de livros";
    if (r <= 46) return "Corda de teia";
    if (r <= 55) return "Estojo de disfarces";
    if (r <= 64) return "Flauta mística";
    if (r <= 73) return "Luneta";
    if (r <= 82) return "Maleta de medicamentos";
    if (r <= 91) return "Organizador de pergaminhos";
    return "Sela";
}

function consumivel() {
    const r = rand(1, 100);
    if (r === 1) return "Ácido";
    if (r === 2) return "Agua benta";
    if (r <= 4) return "Baga-de-fogo";
    if (r <= 9) return "Bálsamo de drogadora";
    if (r <= 13) return "4x Bálsamo restaurador";
    if (r === 14) return "Beladona";
    if (r <= 16) return "2x Bomba de fumaça";
    if (r <= 19) return "Bomba";
    if (r === 20) return "Bruma sonolenta";
    if (r <= 23) return "Cicuta";
    if (r === 24) return "Corrosivo mineral";
    if (r <= 26) return "Cosmético";
    if (r <= 28) return "Dente-de-dragão";
    if (r <= 30) return "Elixir do amor";
    if (r <= 32) return "Elixir quimérico";
    if (r <= 34) return "Esporos de cogumelo";
    if (r === 35) return "Essência abissal";
    if (r <= 39) return "2x Essência de mana";
    if (r <= 41) return "Essência de sombra";
    if (r <= 44) return "Éter elemental";
    if (r <= 47) return "2x Fogo alquímico";
    if (r === 48) return "Gelo extremo";
    if (r === 49) return "Gema de Força";
    if (r <= 52) return "Isca putrefata";
    if (r <= 54) return "Lágrima pétrea";
    if (r <= 56) return "Líquen lilás";
    if (r <= 58) return "Musgo púrpura";
    if (r <= 60) return "Névoa tóxica";
    if (r <= 62) return "Óleo de baleia";
    if (r <= 64) return "Óleo de besouro";
    if (r <= 66) return "Ossos de monstro";
    if (r === 67) return "Peçonha anciã";
    if (r === 68) return "Peçonha comum";
    if (r <= 70) return "Peçonha concentrada";
    if (r === 71) return "Peçonha irritante";
    if (r === 72) return "Peçonha potente";
    if (r <= 74) return "Pedaço de língua";
    if (r <= 78) return "Pó azul";
    if (r <= 81) return "2x Pó de cristal";
    if (r <= 84) return "2x Pó de giz";
    if (r === 85) return "Pó de lich";
    if (r <= 87) return "Pó de desaparecimento";
    if (r === 88) return "Raio cristalizado";
    if (r <= 90) return "Ramo verdejante";
    if (r === 91) return "Riso de Nimb";
    if (r <= 93) return "Saco de sal";
    if (r <= 96) return "2x Seixo de âmbar";
    if (r <= 98) return "Terra de cemitério";
    return "Veneno batráquio";
}

function pocao() {
    const r = rand(1, 100);
    if (r === 1) return "Abençoar Alimentos (óleo)";
    if (r <= 3) return "Área Escorregadia (granada)";
    if (r <= 6) return "Arma Mágica (óleo)";
    if (r === 7) return "Compreensão";
    if (r <= 15) return "Curar Ferimentos (2d8+2 PV)";
    if (r <= 18) return "Disfarce Ilusório";
    if (r <= 20) return "Escuridão (óleo)";
    if (r <= 22) return "Luz (óleo)";
    if (r <= 24) return "Névoa (granada)";
    if (r <= 26) return "Primor Atlético";
    if (r <= 28) return "Proteção Divina";
    if (r <= 30) return "Resistência a Energia";
    if (r <= 32) return "Sono";
    if (r === 33) return "Suporte Ambiental";
    if (r === 34) return "Tranca Arcana (óleo)";
    if (r === 35) return "Visão Mística";
    if (r === 36) return "Vitalidade Fantasma";
    if (r <= 38) return "Escudo da Fé (aprimoramento para duração cena)";
    if (r <= 40) return "Alterar Tamanho";
    if (r <= 42) return "Aparência Perfeita";
    if (r === 43) return "Armamento da Natureza (óleo)";
    if (r <= 49) return "Bola de Fogo (granada)";
    if (r <= 51) return "Camuflagem Ilusória";
    if (r <= 53) return "Concentração de Combate (aprimoramento para duração cena)";
    if (r <= 62) return "Curar Ferimentos (4d8+4 PV)";
    if (r <= 66) return "Físico Divino";
    if (r <= 68) return "Mente Divina";
    if (r <= 70) return "Metamorfose";
    if (r <= 75) return "Purificação";
    if (r <= 77) return "Velocidade";
    if (r <= 79) return "Vestimenta da Fé (óleo)";
    if (r === 80) return "Voz Divina";
    if (r <= 82) return "Arma Mágica (óleo; aprimoramento para bônus +3)";
    if (r <= 88) return "Curar Ferimentos (7d8+7 PV)";
    if (r === 89) return "Físico Divino (aprimoramento para três atributos)";
    if (r <= 92) return "Invisibilidade (aprimoramento para duração cena)";
    if (r <= 96) return "Bola de Fogo (granada; aprimoramento para 10d6 de dano)";
    return "Curar Ferimentos (11d8+11 PV)";
}

function equipamentos(a) {
    if (a === 1) { // Armas
        const r = rand(1, 100);
        if (r <= 2) return ["Açoite finntroll", "Corpo a corpo"];
        if (r === 3) return ["Adagas", "Corpo a corpo"];
        if (r === 4) return ["Alabarda", "Corpo a corpo"];
        if (r <= 7) return ["Alfange", "Corpo a corpo"];
        if (r === 8) return ["Arcabuz", "Disparo"];
        if (r <= 11) return ["Arco curto", "Disparo"];
        if (r <= 14) return ["Arco longo", "Disparo"];
        if (r <= 16) return ["Arpão", "Corpo a corpo"];
        if (r === 17) return ["Bacamarte", "Corpo a corpo"];
        if (r <= 20) return ["Besta leve", "Disparo"];
        if (r <= 22) return ["Besta pesada", "Disparo"];
        if (r <= 24) return ["Manopla", "Corpo a corpo"];
        if (r <= 26) return ["Garra Feroz", "Corpo a corpo"];
        if (r <= 28) return ["Cimitarra", "Corpo a corpo"];
        if (r <= 30) return ["Corrente de espinhos", "Corpo a corpo"];
        if (r <= 32) return ["Espada bastarda", "Corpo a corpo"];
        if (r <= 35) return ["Espada curta", "Corpo a corpo"];
        if (r <= 38) return ["Espada longa", "Corpo a corpo"];
        if (r <= 41) return ["Espada Vespa", "Corpo a corpo"];
        if (r <= 44) return ["Florete", "Corpo a corpo"];
        if (r === 45) return ["Foice", "Corpo a corpo"];
        if (r <= 47) return ["Gadanho", "Corpo a corpo"];
        if (r <= 50) return ["Gladio", "Corpo a corpo"];
        if (r <= 53) return ["Katana", "Corpo a corpo"];
        if (r === 54) return ["Lança", "Corpo a corpo"];
        if (r === 55) return ["Lança de fogo", "Disparo"];
        if (r === 56) return ["Lança montada", "Corpo a corpo"];
        if (r <= 58) return ["Maça", "Corpo a corpo"];
        if (r === 59) return ["Machadinha", "Corpo a corpo"];
        if (r <= 61) return ["Machado anão", "Corpo a corpo"];
        if (r <= 64) return ["Machado de batalha", "Corpo a corpo"];
        if (r <= 67) return ["Machado de guerra", "Corpo a corpo"];
        if (r <= 70) return ["Machado táurico", "Corpo a corpo"];
        if (r === 71) return ["Mangual", "Corpo a corpo"];
        if (r <= 73) return ["Marreta", "Corpo a corpo"];
        if (r <= 75) return ["Martelo de guerra", "Corpo a corpo"];
        if (r <= 78) return ["Montante", "Corpo a corpo"];
        if (r <= 80) return ["Mordida do diabo", "Corpo a corpo"];
        if (r <= 82) return ["Mosquete", "Corpo a corpo"];
        if (r === 83) return ["Neko-te", "Corpo a corpo"];
        if (r === 84) return ["Picareta", "Corpo a corpo"];
        if (r <= 87) return ["Pistola", "Disparo"];
        if (r <= 89) return ["Pistola-Punhal", "Disparo"];
        if (r === 90) return ["Presa da serpente", "Corpo a corpo"];
        if (r <= 92) return ["2x Shuriken", "Disparo"];
        if (r <= 94) return ["Tetsubo", "Corpo a corpo"];
        if (r <= 97) return ["Traque", "Disparo"];
        if (r <= 99) return ["Tridente", "Corpo a corpo"];
        return ["Zarabatana", "Disparo"];
    } else { // Esotéricos
        const r = rand(1, 100);
        if (r <= 9) return ["Ankh solar"];
        if (r <= 18) return ["Bolsa de pó"];
        if (r <= 24) return ["Cajado arcano"];
        if (r <= 32) return ["Cetro elemental"];
        if (r <= 41) return ["Costela de lich"];
        if (r <= 48) return ["Dedo de ente"];
        if (r <= 55) return ["Luva de ferro"];
        if (r <= 63) return ["Medalhão de prata"];
        if (r <= 71) return ["Orbe cristalino"];
        if (r <= 80) return ["Tomo de guerra"];
        if (r <= 88) return ["Tomo do rancor"];
        if (r <= 94) return ["Tomo hermético"];
        return ["Varinha arcana"];
    }
}

function melhoria(a, b) {
    let melhora = [];
    let item = equipamentos(a);
    
    // Safety break para evitar loop infinito
    let attempts = 0;
    while (b > 0 && attempts < 100) {
        attempts++;
        let m = "";
        let cost = 1;
        const r = rand(1, 100);

        if (a === 1) { // Armas
            if (r <= 5) { m = "Atroz"; if(!melhora.includes("Atroz") && !melhora.includes("Cruel") && b >= 2) { melhora.push("Cruel"); melhora.push("Atroz"); b-=2; continue; } else if (!melhora.includes("Atroz") && melhora.includes("Cruel")) { m="Atroz"; } else continue; }
            else if (r <= 10) m = "Banhada a ouro";
            else if (r <= 19) m = "Certeira";
            else if (r <= 24) m = "Cravejada de gemas";
            else if (r <= 33) m = "Cruel";
            else if (r <= 38) m = "Discreta";
            else if (r <= 47) m = "Equilibrada";
            else if (r <= 56) m = "Injeção alquímica";
            else if (r <= 61) m = "Macabra";
            else if (r <= 71) { if(!melhora.includes("Precisa")) m = "Maciça"; else continue; }
            else if (r <= 75) {
                if (b < 2) continue;
                const materiais = ["Aço-Rubi", "Adamante", "Casco de Monstro", "Gelo Eterno", "Lanajuste", "Madeira de Tollon", "Máteria Vermelha", "Mitral", "Prata"];
                m = materiais[rand(0, 8)];
                cost = 2;
            }
            else if (r <= 80) { if (item[1] === "Disparo") m = "Mira telescópica"; else continue; }
            else if (r <= 85) { 
                if(!melhora.includes("Penetrante") && !melhora.includes("Cruel") && b >= 2) { melhora.push("Cruel"); melhora.push("Penetrante"); b-=2; continue; } 
                else if (!melhora.includes("Penetrante") && melhora.includes("Cruel")) { m="Penetrante"; } 
                else continue;
            }
            else if (r <= 95) { if(!melhora.includes("Maciça")) m = "Precisa"; else continue; }
            else { 
                if(!melhora.includes("Pungente") && !melhora.includes("Certeira") && b >= 2) { melhora.push("Certeira"); melhora.push("Pungente"); b-=2; continue; } 
                else if (!melhora.includes("Pungente") && melhora.includes("Certeira")) { m="Pungente"; } 
                else continue;
            }
        } else { // Esotéricos
            if (r <= 4) m = "Banhado a ouro";
            else if (r <= 24) m = "Canalizador";
            else if (r <= 28) m = "Cravejada de gemas";
            else if (r <= 32) m = "Discreto";
            else if (r <= 52) m = "Energético";
            else if (r <= 56) m = "Macabro";
            else if (r <= 60) {
                if (b < 2) continue;
                const materiais = ["Aço-Rubi", "Adamante", "Casco de Monstro", "Gelo Eterno", "Lanajuste", "Madeira de Tollon", "Máteria Vermelha", "Mitral", "Prata"];
                m = materiais[rand(0, 8)];
                cost = 2;
            }
            else if (r <= 80) m = "Poderoso";
            else m = "Vigilante";
        }

        if (m && !melhora.includes(m)) {
            melhora.push(m);
            b -= cost;
        }
    }
    return `${item[0]} com ${melhora.join(", ")}`;
}

function magico(a, b) {
    let magia = [];
    let resultado = "";
    
    // Equipamentos com Magia
    if (a === 1) {
        let item = equipamentos(1);
        resultado = item[0] + " com ";
        let attempts = 0;
        while (b > 0 && attempts < 100) {
            attempts++;
            let m = "";
            let cost = 1;
            const r = rand(1, 100);

            if (r <= 5) m = "Ameaçadora";
            else if (r <= 10) m = "Anticriatura";
            else if (r <= 12) m = "Arremesso";
            else if (r <= 14) m = "Assassina";
            else if (r <= 16) m = "Caçadora";
            else if (r <= 21) m = "Congelante";
            else if (r <= 23) m = "Conjuradora";
            else if (r <= 28) m = "Corrosiva";
            else if (r <= 30) m = "Dançarina";
            else if (r <= 34) m = "Defensora";
            else if (r <= 36) m = "Destruidora";
            else if (r <= 38) m = "Dilacerante";
            else if (r <= 40) m = "Drenante";
            else if (r <= 46) m = "Elétrica";
            else if (r <= 51) {
                if(!magia.includes("Energética") && !magia.includes("Formidável") && b >= 2) { magia.push("Formidável"); magia.push("Energética"); b-=2; continue; }
                else if (!magia.includes("Energética") && magia.includes("Formidável")) m="Energética";
                else continue;
            }
            else if (r <= 53) m = "Excruciante";
            else if (r <= 58) m = "Flamejante";
            else if (r <= 68) m = "Formidável";
            else if (r <= 74) {
                if(!magia.includes("Lancinante") && !magia.includes("Dilacerante") && b >= 2) { magia.push("Dilacerante"); magia.push("Lancinante"); b-=2; continue; }
                else if (!magia.includes("Lancinante") && magia.includes("Dilacerante")) m="Lancinante";
                else continue;
            }
            else if (r <= 82) {
                if(!magia.includes("Magnífica") && !magia.includes("Formidável") && b >= 2) { magia.push("Formidável"); magia.push("Magnífica"); b-=2; continue; }
                else if (!magia.includes("Magnífica") && magia.includes("Formidável")) m="Magnífica";
                else continue;
            }
            else if (r <= 84) m = "Piedosa";
            else if (r <= 86) m = "Profana";
            else if (r <= 88) m = "Sagrada";
            else if (r <= 90) m = "Sanguinária";
            else if (r <= 92) m = "Trovejante";
            else if (r <= 94) m = "Tumular";
            else if (r <= 98) m = "Veloz";
            else m = "Venenosa";

            if (m && !magia.includes(m)) {
                magia.push(m);
                b -= cost;
            }
        }
        return resultado + magia.join(" e ");
    } 
    // Acessórios
    else if (a === 2) {
        const r = rand(1, 100);
        if (b === 1) { // Menor
            if (r <= 2) return "Anel do sustento";
            if (r <= 7) return "Bainha mágica";
            if (r <= 12) return "Corda da escalada";
            if (r <= 14) return "Ferraduras da velocidade";
            if (r <= 19) return "Garrafa da fumaça eterna";
            if (r <= 24) return "Gema da luminosidade";
            if (r <= 29) return "Manto élfico";
            if (r <= 34) return "Mochila de carga";
            if (r <= 40) return "Brincos da sagacidade";
            if (r <= 46) return "Luvas da delicadeza";
            if (r <= 52) return "Manoplas da força do ogro";
            if (r <= 59) return "Manto da resistência";
            if (r <= 65) return "Manto do fascínio";
            if (r <= 71) return "Pingente da sensatez";
            if (r <= 77) return "Torque do vigor";
            if (r <= 82) return "Chapéu do disfarce";
            if (r <= 84) return "Flauta fantasma";
            if (r <= 89) return "Lanterna da revelação";
            if (r <= 96) return "Anel da proteção";
            if (r <= 98) return "Anel do escudo mental";
            return "Pingente da saúde";
        } else { // Médio
            if (r <= 4) return "Anel de telecinesia";
            if (r <= 8) return "Bola de cristal";
            if (r <= 10) return "Caveira maldita";
            if (r <= 14) return "Botas aladas";
            if (r <= 18) return "Braceletes de bronze";
            if (r <= 24) return "Anel da energia";
            if (r <= 30) return "Anel da vitalidade";
            if (r <= 34) return "Anel de invisibilidade";
            if (r <= 38) return "Braçadeiras do arqueiro";
            if (r <= 42) return "Brincos de Marah";
            if (r <= 46) return "Faixas do pugilista";
            if (r <= 50) return "Manto da aranha";
            if (r <= 54) return "Vassoura voadora";
            if (r <= 58) return "Símbolo abençoado";
            if (r <= 64) return "Amuleto da robustez";
            if (r <= 68) return "Botas velozes";
            if (r <= 74) return "Cinto da força do gigante";
            if (r <= 80) return "Coroa majestosa";
            if (r <= 86) return "Estola da serenidade";
            if (r <= 88) return "Manto do morcego";
            if (r <= 94) return "Pulseiras da celeridade";
            return "Tiara da sapiência";
        }
    }
}

function processarPunga(nd) {
    const r = rand(1, 100);
    // ND < 5
    if (nd < 5) {
        if (r < 36) return diversos();
        if (r < 71) return consumivel();
        return equipamentos(rand(1, 2))[0];
    }
    // ND 5-10
    if (nd < 11) {
        if (r < 21) return diversos();
        if (r < 41) return consumivel();
        if (r < 70) return equipamentos(rand(1, 2))[0];
        if (r < 85) return `Poção: ${pocao()}`;
        if (r < 100) return melhoria(rand(1, 2), 1);
        return melhoria(rand(1, 2), 2);
    }
    // ND 11-16
    if (nd < 17) {
        if (r < 11) return diversos();
        if (r < 26) return consumivel();
        if (r < 61) return equipamentos(rand(1, 2))[0];
        if (r < 81) return `Poção: ${pocao()}`;
        if (r < 96) return melhoria(rand(1, 2), 2);
        if (r < 100) return melhoria(rand(1, 2), 3);
        return magico(rand(1, 3), 1);
    }
    // ND 17+
    if (r < 21) return consumivel();
    if (r < 46) return equipamentos(rand(1, 2))[0];
    if (r < 71) return `Poção: ${pocao()}`;
    if (r < 91) return melhoria(rand(1, 2), 3);
    if (r < 96) return melhoria(rand(1, 2), 4);
    if (r < 100) return magico(rand(1, 3), 1);
    return magico(rand(1, 3), 2);
}

function processarDinheiro(nd) {
    const numero = rand(1, 20);
    const dado = rand(1, 10);
    let din = 0;
    
    if (numero < 3) din = dado * 2 * nd;
    else if (numero < 8) din = dado * 3 * nd;
    else if (numero < 14) din = dado * 5 * nd;
    else if (numero < 19) din = dado * 8 * nd;
    else din = dado * 10 * nd;
    
    return din;
}

// Exporta as funções
module.exports = {
    diversos, consumivel, pocao, equipamentos, melhoria, magico, processarPunga, processarDinheiro
};