// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract Travillo {
    // length of places on this contract
    uint internal placesLength = 0;

    // Address of the cusd token
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address[] public cartAddresses;
    address[] empty;


    // structure for each Cloth
    struct Place {
        address payable owner;
        string name;
        string image;
        string description;
        string location;
        uint price;
    }


    // mapping of an id to a places
    mapping (uint => Place) internal places;


    // Mapping of the an address to his/her purchase history
    mapping (address => uint[]) internal history;


    // create a places and add to the blockchain
    function addPlace(
        string memory _name,
        string memory _image,
        string memory _description,
        string memory _location,
        uint _price
    ) public {
        places[placesLength] = Place(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _location,
            _price
        );
        placesLength++;
    }

    // fetch a places
    function getPlaces(uint _index) public view returns (
        address payable,
        string memory,
        string memory,
        string memory,
        string memory,
        uint
    ) {
        return (
        places[_index].owner,
        places[_index].name,
        places[_index].image,
        places[_index].description,
        places[_index].location,
        places[_index].price
        );
    }

    // book a places and pay the price
    function bookPlace(uint _index) public payable  {
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                places[_index].owner,
                places[_index].price
            ),
            "Transfer failed."
        );
        // save the transaction to the history mapping
        history[msg.sender].push(_index);
    }

    // add item address to card
    function addCartAddress(address sellerAdd) public returns (address[] memory){
        cartAddresses.push(sellerAdd);
        return (cartAddresses);
    }

    // clear all cart addresses
    function clearCartAddress() public returns (uint256){
        cartAddresses = empty;
        return (cartAddresses.length);
    }

    // book cart items
    function bookCart(uint totalSumPrice) public payable {
        for (uint i = 0; i < cartAddresses.length; i++) {
            payable(cartAddresses[i]).transfer(totalSumPrice);
        }
    }

    // get lenght of place array
    function getPlacesLength() public view returns (uint) {
        return (placesLength);
    }
}