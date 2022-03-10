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
    uint[] public cartIndex;

    //Events that will emit when a new place is added or if a user books a place
    event newPlace(address indexed owner, string name);
    event placeBooked(address indexed seller, uint price, address indexed buyer);

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
        emit newPlace(msg.sender, _name);
    }

    // fetch places
    
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

        emit placeBooked( places[_index].owner, places[_index].price, msg.sender);
    }

    // add item to cart
    function addCartAddress(uint index) public returns (uint[] memory){
        cartIndex.push(index);
        return (cartIndex);
    }

    // clear all the cart
    function clearCart() public{
        delete cartIndex;
    }

    /*  This function is used to buy all the items in the cart using the following approach:
        User transfers the total money to the contract and the contract iterates through the owners and 
        send them their money
    */
    function bookCartV1(uint totalSumPrice) public payable {
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                address(this),
                totalSumPrice
            ),
            "Transfer failed."
        );
        for (uint i = 0; i < cartIndex.length; i++) {
            uint index = cartIndex[i];
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                address(this),
                places[index].owner,
                places[index].price
            ),
            "Transfer failed."
        );
        }
    }

/* An alternative to the above function where this ask the user directly to send the money
    one by one to the owners, I doesn't bring in the risk of the contract holding some assests
    but, the user would need to allow and confirm all the transactions one by one */

    function bookCartV2() public payable{
        for (uint i = 0; i < cartIndex.length; i++) {
            uint index = cartIndex[i];
            require(
             IERC20Token(cUsdTokenAddress).transferFrom(
                 address(this),
                  places[index].owner,
                 places[index].price
                ),
                "Transfer failed."
            );
        }
    }

    //Function which the user can call to get his purchase history
    function getHistory() public view returns(uint[] memory){
            return(history[msg.sender]);
    }

    // get lenght of place array
    function getPlacesLength() public view returns (uint) {
        return (placesLength);
    }
}