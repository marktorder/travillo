// imports
import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import TravilloAbi from '../contract/travillo.abi.json'
import erc20Abi from '../contract/erc20.abi.json'
import {contractAddress, ERC20_DECIMALS, cUSDContractAddress} from "./utils/constants";

// setting global var, let, const

let kit // the kit
let cart = [] // cart object to contain the cart place array (array of object)
let cartTotal = 1 // init cartTotal state
let contract // the contract
let places = [] // places object to contain the places place array (array of object)
let cartAddress = [] // cart address object to contain the cart addresses of chained transaction

// connect to celo wallet
const connectCeloWallet = async function () {
    if (window.celo) {
        notification("⚠️ Please approve this DApp to use it.")
        try {
            await window.celo.enable()
            notificationOff()

            const web3 = new Web3(window.celo)
            kit = newKitFromWeb3(web3)

            // accessing user account
            const accounts = await kit.web3.eth.getAccounts()
            kit.defaultAccount = accounts[0]

            // setting contract on the web3 using the kit
            contract = new kit.web3.eth.Contract(TravilloAbi, contractAddress)
        } catch (error) {
            // error validation response
            notification(`⚠️ ${error}.`)
        }
    } else {
        // installation notice
        notification("⚠️ Please install the CeloExtensionWallet.")
    }
}

// approve traction notification
async function approve(_price) {
    // setting the cUSD contract on the web3 using the kit
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

    return  await cUSDContract.methods
        .approve(contractAddress, _price)
        .send({ from: kit.defaultAccount })

}

// getting total balance in cUSD
const getBalance = async function () {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
    // shifting and converting the balance to currency format
    //  using the "priceToCurrency()" below
    const cUSDBalance = priceToCurrency(totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS))
    document.querySelector("#balance").textContent = cUSDBalance
}

// get places
const getPlaces = async function () {
    const placesLength = await contract.methods.getPlacesLength().call()
    const _places = []
    for (let i = 0; i < placesLength; i++) {
        let _place = new Promise(async (resolve) => {
            let p = await contract.methods.getPlaces(i).call()
            resolve({
                index: i,
                owner: p[0],
                name: p[1],
                image: p[2],
                description: p[3],
                location: p[4],
                price: new BigNumber(p[5]),
            })
        })
        _places.push(_place)
    }
    places = await Promise.all(_places)
    renderPlaces()
}

// rending place list
function renderPlaces() {
    document.getElementById("places").innerHTML = ""
    places.forEach((_place) => {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-3 mb-3 card cus-card position-relative"
        newDiv.innerHTML = placesTemplate(_place)
        document.getElementById("places").appendChild(newDiv)
    })
}

// place template
function placesTemplate(_place) {
    return `
    <img src="${_place.image}"
        class="card-img-top rounded fit-image" alt="${_place.name} image" width="100%" height="100%">
    <div class="price shadow blur">
        <small class="fw-light">Price</small> ${priceToCurrency(_place.price.shiftedBy(-ERC20_DECIMALS).toFixed(2))} cUSD
        <br>
        <small class="fw-light">Location</small> ${_place.location}
        <br>
        <small>
            <a href="https://alfajores-blockscout.celo-testnet.org/address/${_place.owner}/transactions"
            target="_blank" rel="noopener noreferrer"
            class="fw-light p">${truncateAddress(_place.owner)}</a>
        </small>
    </div>
    <div class="card-body cus-card-body p-2 text-white blur">
        <h5 class="card-title">${_place.name}</h5>
        <p class="card-text">
            <small>
                ${truncateDescription(_place.description)}
            </small>
        </p>
        <a id="${_place.index}" class="btn bookPlace btn-dark bgp text-light">Book Now!</a>
        Or
        <button id="${_place.index}" class="add-to-cart btn btn-dark bgp text-light">To Cart</button>
    </div>
`
}

// truncate owner's address
function truncateAddress(_address) {
    return String(_address).substring(0, 10)
}

// truncate place description
function truncateDescription(_description) {
    return `${String(_description).substring(0, 150)}...`
}

// price to currency format
function priceToCurrency(price) {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// notification on
function notification(_message) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _message
}

// notification off
function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}

// sell new place
document
    .querySelector("#addNewPlace")
    .addEventListener("click", async () => {
        const _place = [
            document.getElementById("placeName").value,
            document.getElementById("placeImage").value,
            document.getElementById("placeDescription").value,
            document.getElementById("placeLocation").value,
            new BigNumber(document.getElementById("placePrice").value).shiftedBy(ERC20_DECIMALS).toString(),
        ]

        notification(`Adding "${_place[0]}"...`)

        const checkIfEmpty = isEmptyObject(_place) // checking if form is empty on submission

        if (checkIfEmpty) {
            notification('"FORM" Can not be empty!!!')
        } else {
            try {
                await contract.methods
                    .addPlace(..._place)
                    .send({ from: kit.defaultAccount })
                    notification(`You successfully added "${_place[0]}".`)
                    getPlaces()
                    document.getElementById("placeImage").value = ""
                    document.getElementById("placeName").value = ""
                    document.getElementById("placePrice").value = ""
                    document.getElementById("placeDescription").value = ""
                    document.getElementById("placeLocation").value = ""
            } catch (error) {
                notification(`⚠️ ${error}.`)
            }
        }
    })

// booking new place
document.querySelector("#places").addEventListener("click", async (e) => {
    if (e.target.className.includes("bookPlace")) {
        const index = e.target.id
        notification("⌛ Waiting for payment approval...")
        try {
            await approve(places[index].price.toString())
        } catch (error) {
            notification(`⚠️ ${error}.`)
        }
        notification(`⌛ Awaiting payment for "${places[index].name}"...`)
        try {
           await contract.methods
                .bookPlace(index)
                .send({ from: kit.defaultAccount })
            notification(`🎉 You successfully bought "${places[index].name}".`)
            getPlaces()
            getBalance()
        } catch (error) {
            notification(`⚠️ ${error}.`)
        }
    }
})

// check if object is empty
function isEmptyObject(obj) {
    let arr = [];
    for (let key in obj) {
        arr.push(obj[key] !== undefined && obj[key] !== null && obj[key] !== "");
    }
    return arr.includes(false);
}

// CART FUNCTIONALITY
// Add item
document.querySelector("#places").addEventListener("click", (e) => {
    if (e.target.className.includes("add-to-cart")) {
        const index = e.target.id
        const _place = places[index]
        let isInCart = false // is item in cart?

        // check if item is already in cart
        if (cart.length > 0) {
            cart.forEach(item => {
                isInCart = item.index === _place.index;
            })
        }

        if (isInCart) {
            notification(`${_place.name} already in CART!`)
        } else {
            // push to cart object
            cart.push({
                owner: _place.owner,
                image: _place.image,
                name: _place.name,
                price: _place.price,
                description: _place.description,
                location: _place.location,
                index: _place.index,
            })

            // get total sum before and after
            let oldSum = document.getElementById("totalSum").textContent
            let newSum = parseFloat(oldSum) + parseFloat(_place.price.shiftedBy(-ERC20_DECIMALS).toFixed(2))
            document.getElementById("totalSum").textContent = newSum

            notification(`${_place.name} has been added to CART!`)

            // clear out
            document.getElementById("emptyCart").textContent = ""
            renderCart();
            // getting cart total items
            document.querySelector("#cartTotal").textContent = cartTotal++
        }
    }
})

// book cart
document.querySelector("#bookCart").addEventListener("click", async (e) => {
    if (e.target.className.includes("book-cart")) {
        let totalSumPrice = document.getElementById("totalSum").textContent
        totalSumPrice = new BigNumber(parseFloat(totalSumPrice)).shiftedBy(ERC20_DECIMALS)

        if (totalSumPrice > 0) {
            notification("⌛ Waiting for payment approval...")
            try {
                await approve(totalSumPrice.toString())
            } catch (error) {
                notification(`⚠️ ${error}.`)
            }
            notification(`⌛ Awaiting payment for Cart...`)
            try {
                cart.forEach(item => {
                    cartAddress.push(item.owner)
                })
                await contract.methods.clearCartAddress() // clear the cart address in contract
                await contract.methods.addCartAddress(cartAddress) // add new cart addresses in contract
                await contract.methods.bookCart(totalSumPrice) // call the book cart

                notification(`You successfully bought "${totalSumPrice.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD" worth of places.`)

                // clear cart and update app
                document.getElementById("totalSum").textContent = 0
                document.getElementById("balance").textContent = 0
                document.querySelector("#cartTotal").textContent = 0
                cart = []
                cart.length = 0
                await contract.methods.clearCartAddress() // clear contract addresses
                cartTotal = 1 // reset cart total to 1
                document.getElementById("emptyCart").textContent = "Transaction completed, cart is empty!"
                renderCart()
                getPlaces()
                getBalance()
            } catch (error) {
                notification(`⚠️ ${error}.`)
            }
        } else {
            notification(`Please add items to cart first`)
        }
    }
})

// render cart list
function renderCart() {
    document.getElementById("cart").innerHTML = ""
    cart.forEach((cartItem) => {
        const newDiv = document.createElement("div")
        const footerDiv = document.createElement("div")
        newDiv.className = "mb-3 d-flex"
        newDiv.innerHTML = cartTemplate(cartItem)
        document.getElementById("cart").appendChild(newDiv)
        document.getElementById("cart").appendChild(footerDiv)
    })
}

// cart template
function cartTemplate(_place) {
    return `
    <img src="${_place.image}"
        class="rounded" alt="${_place.name} image" width="200px" height="150px" style="object-fit: cover; padding-right: .5rem;">
    <div>
        <h6 class="card-title fw-bold">${_place.name}</h6>
        <b>${priceToCurrency(_place.price.shiftedBy(-ERC20_DECIMALS).toFixed(2))} cUSD</b>
        <p class="card-text">
            ${truncateDescription(_place.description)}
        </p>
    </div>
`
}

// load functions on start
window.addEventListener("load", async () => {
    notification("Getting ready...")
    await connectCeloWallet()
    await getBalance()
    await getPlaces()
    renderPlaces()
    notificationOff()
    // empty cart notice
    if (cart.length <= 0) {
        document.getElementById("emptyCart").textContent = "Cart is empty!"
    }
})