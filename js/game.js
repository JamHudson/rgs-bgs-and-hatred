/* Red Guys, Blue Guys, and their unending hatred for one another.
 * 
 * This is a simple game where two players take turns spawning units to destroy the other's base.
 * Each unit behaves differently and is designed to counter one or more other units.
 * To sucessfully break through the enemy's defenses, learn the match-ups and respond accordingly.
 * For those without friends to play this with, there is a setting to make a unit automatically spawn for either and each side each turn.
 * There is also a turn timer that can be set to automatically go to the next turn (its very quick.)
 * 
 * Author: J.H.
 * 11/26/2025
 * this also emphasizes the "More than one use of javascript comments to document the purpose of certain code blocks or functions" 
 */
const form = document.body.children[0]
const main = document.body.children[1]


const sliderMapY = document.getElementById("map-y")
const labelMapY = document.getElementById("label-map-y")
const sliderMapX = document.getElementById("map-x")
const labelMapX = document.getElementById("label-map-x")

const redButton = document.getElementById("red-team-auto")
const blueButton = document.getElementById("blue-team-auto")

const field = document.getElementById("field")
const unitTemplate = document.getElementById("unit-template")
const emptyCell = document.getElementById("empty-cell")
const slider = document.getElementById("time-slider")
const gameSpeed = document.getElementById("game-speed")
const debugTray = document.getElementById("debug-tray")
const debugUnits = document.getElementById("evil-units")

// The size of the map, overwritten on game start.
let mapSizeX = 5
let mapSizeY = 1

// The duration (in ms) of rounds, ovewritten on game start.
let turnSpeed = 400 // <-------------- At least one javascript variable to hold text or numbers

let blankCells = [] // <---------- The use of at least one javascript array, which can be an array of objects

// Returns the other team number. 1 if given 0; 0 if given 1.
function getOtherTeamNum(myTeam) { // <------- The use of at least one javascript function
    if (myTeam == 0) { return 1 }
    else if (myTeam == 1) { return 0 }
}

// Returns the name of the team number supplied. Blue if 0; Red if 1. 
function getTeamName(teamNum) {
    if (teamNum == 0) return "Blue"
    else if (teamNum == 1) return "Red"
}

// The object for the bases, does not have a visible element in game.
class Base {
    constructor(teamNum) {
        this.hp = 15
        this.team = teamNum
        if (this.team == 0) {
            this.elem = document.getElementById("team1-info")
        } else if (this.team == 1) {
            this.elem = document.getElementById("team2-info")
        }
        this.elem.addEventListener("click", () => {
            alert(`Team = ${getTeamName(teamNum)}\nHealth = ${this.hp}`)
        })
    }
    damage(amount) {
        this.hp -= amount
        this.updateHealth()
    }
    updateHealth() {
        this.elem.innerHTML = this.hp + "/15" // <-------- The use of the javascript Document Object Model to manipulate at least one HTML tag
        if (this.hp <= 5) { this.elem.style.color = "red" } // Critical Health
        else { this.elem.style.color = "greenyellow" } // Normal Health
        checkForVictory()
    }
}

// For inheritance
class Unit {
    constructor(maxhp, dmg, teamNum) {
        this.maxhp = maxhp
        this.hp = maxhp
        this.dmg = dmg
        this.team = teamNum
        this.x = 0
        this.y = 0
        // Set up the element.
        this.elem = unitTemplate.cloneNode(true)
        this.elem.removeAttribute("id")
        // Add the element to the game.
        field.appendChild(this.elem)
        // Set the team specific information for this unit.
        if (teamNum == 1) { // <---------- At least one javascript operator <---------- At least one selection statement such as if or switch
            this.elem.lastElementChild.style.transform = "scaleX(-1)"
            this.elem.lastElementChild.style.filter = "hue-rotate(0deg)";
            this.forward = -1
        } else {
            this.elem.lastElementChild.style.filter = "hue-rotate(240deg)";
            this.forward = 1
        }
        // Reveal the unit.
        this.elem.hidden = false
        // Debug checker.
        this.elem.addEventListener("click", () => {
            alert(`Team = ${getTeamName(teamNum)}\nHealth = ${this.hp}\nDamage = ${this.dmg}\nx = ${this.x}, y = ${this.y}\nIndex = ${units.indexOf(this)}`)
        })
        // Add to lists.
        teams[teamNum].push(this)
        units.push(this)
        // Set health display for first time.
        updateInfo(this)
    }
    //Override(?)
    toString() {
        return `${getTeamName(this.team)} ${this.constructor.name}`
    }
    // Heals this unit.
    heal(amount, source) {
        this.hp += amount
        this.hp = Math.min(this.hp, this.maxhp)
        updateInfo(this)
    }
    // Damages this unit.
    damage(amount, source) {
        this.hp -= amount
        updateInfo(this)
    }
    // Returns the damage this unit deals.
    dealDamage() {
        return this.dmg;
    }
    // Returns whether a unit is adjacent to another.
    adjacent(that) {
        let vertical = this.y == that.y // Is this unit on the same plane as this?
        let horizontal = (Math.abs(this.x - that.x) <= 1) // Is the x distance between this unit and that unit less than 1? 
        return (vertical && horizontal)
    }
    // Returns whether a unit is blocking another.
    blockedBy(that) {
        let samePlane = (that.y == this.y) // Is this unit on the same plane as this?
        let inFront = (that.x == this.x + this.forward) // Is that in front of this?
        return (samePlane && inFront)
    }
    // Moves the unit forward on the field.
    move() {
        place(this, this.x + this.forward, this.y) // Places the unit at a position one in front of it.
        if (this.x > mapSizeX || this.x <= 0) { // If the unit is out of bounds now.
            teamBases[getOtherTeamNum(this.team)].damage(this.dmg)
            addToTrash(this)
        }
    }
    // For use by the trash functions, in other words, call that to destroy a unit.
    destroy() {
        // Remove unit from team
        let teamIndex = teams[this.team].indexOf(this)
        teams[this.team].splice(teamIndex, 1)
        // Remove unit from unit list
        let unitIndex = units.indexOf(this)
        units.splice(unitIndex, 1)
        // Remove unit
        this.elem.remove()
        if (unitIndex == -1) {
            debugUnits.append(this.elem)
        }
    }
    isAt(x, y) {
        return (this.x == x && this.y == y)
    }
    // Processes the turn for this unit. Specifically damaging enemies and moving forward.
    doBrain() {
        if (units.indexOf(this) == -1) {
            debugUnits.append(this.elem)
        }
        // Check if any enemy is adjacent to me
        const enemyTeam = teams[getOtherTeamNum(this.team)]
        for (let i = 0; i < enemyTeam.length; i++) {
            const unit = enemyTeam[i]
            if (this.adjacent(unit)) {
                unit.damage(this.dealDamage(), this)
                return // Because I use return to stop the AI at THIS point, I can't use a forEach loop
            }
        }
        // If the brain is here, then no enemy is adjacent.
        // Check if any friend is in front of  me.
        const myTeam = teams[this.team]
        for (let i = 0; i < myTeam.length; i++) {
            const friend = myTeam[i]
            if (friend == this) continue // stupid
            if (this.blockedBy(friend)) {
                return
            }
        }
        // If the brain is here, then no friend is in front of me.
        // I'm free to move forward.
        this.move()
        // I'm done thinking about my turn now.
    }
}

// The basic unit
class Normal extends Unit {
    constructor(teamNum) {
        super(5, 1, teamNum)
    }
}

// Immolators deal damage to themself to deal more damage.
class Immolator extends Unit {
    constructor(teamNum) {
        super(5, 3, teamNum)
        this.elem.lastElementChild.src = "images/red-immolator.png"
    }
    dealDamage() {
        this.damage(2) // Hurt self.
        return this.dmg;
    }
}

// Thorns deal damage to any unit that attacks them (except other thorns because then they'd both instakill eachother)
class Thorn extends Unit {
    constructor(teamNum) {
        super(4, 1, teamNum)
        this.elem.lastElementChild.src = "images/red-thorn.png"
    }
    damage(amount, source) {
        super.damage(amount, source)
        if (!(source instanceof Thorn)) { source.damage(1) } // Prevent counter-damaging thorn.
    }
}

// Shields take one less damage from any attack, which only matters against immolators.
class Shield extends Unit {
    constructor(teamNum) {
        super(6, 1, teamNum)
        this.elem.lastElementChild.src = "images/red-shield.png"
    }
    damage(amount, source) {
        super.damage(Math.max(1, amount - 1), source) // Reduce damage by one (if its not already one)
    }
}

// Regens heal one health per turn.
class Regen extends Unit {
    constructor(teamNum) {
        super(3, 1, teamNum)
        this.elem.lastElementChild.src = "images/red-regen.png"
    }
    doBrain() {
        this.heal(1, this) // Heal once each turn.
        super.doBrain()
    }
    damage(amount, source) {
        if (source instanceof Regen) super.damage(amount + 1, source) // Deal more damage to regenerators (prevent soft-locking)
        else super.damage(amount, source)
    }
}

// Wall kills everything and cannot be stopped... if it worked. (supposed to span every row but that's too much work for me right now)
class Wall extends Unit {
    constructor(teamNum) {
        super(15, 5, teamNum)
        this.elem.lastElementChild.src = "images/red-wall.png"
    }
    // Unique blockedBy that doesn't care about height, in other words, this unit is on every row.
    blockedBy(that) {
        let inFront = (that.x == this.x + this.forward) // Is that in front of this?
        return (inFront)
    }
}

// Table containing each type with its associated String name.
const unitClasses = {
    "Normal": Normal,
    "Immolator": Immolator,
    "Thorn": Thorn,
    "Shield": Shield,
    "Regen": Regen
}

const teams = [[], []] // This is supposed to be two lists holding each unit of the team. Everything is smoke and mirrors without it.
const units = [] // Would this help?

const teamBases = [new Base(0), new Base(1)]

// Returns whether a unit is at the x,y coordinate on the grid.
function isUnitAt(x, y) {
    for (let i = 0; i < units.length; i++) { // <--------- At least one javascript loop to iterate over an array, set of objects, or string
        if (units[i].isAt(x, y)) return true;
    }
    // There is NO unit at x,y
    return false;
}

// Updates the displayed health of a unit, requires it to be set elsewhere.
function updateInfo(unit) {
    unit.elem.firstElementChild.innerHTML = unit.hp + "/" + unit.maxhp
    if (unit.healthLoopAnimation != undefined) {
        unit.healthLoopAnimation.revert()
        unit.healthLoopAnimation == undefined
    }
    if (unit.hp <= 1) {
        unit.healthLoopAnimation = animate(unit.elem.firstElementChild, { color: '#FF0000', duration: 100, loopDelay: 250, alternate: true, loop: true })
    } // Critical Health
    else { unit.elem.firstElementChild.style.color = '#ADFF2F' } // Normal Health
    if (unit.hp <= 0) { addToTrash(unit) } // Destroy defeated unit
}

// Triggers game end if one side has 0 health.
function checkForVictory() {
    if (teamBases[0].hp <= 0) endGame(1)
    else if (teamBases[1].hp <= 0) endGame(0)
}

// Ends the game (running an alert)
function endGame(winnerNum) {
    alert(getTeamName(winnerNum) + " team won the game.\nReload to replay.")
    recalcInterval(true)
}

let autoInterval = null
let AutoSpawningRed = false
let AutoSpawningBlue = false
let currentTeam = 0
// Runs every turn
function onTurn() {
    // Process what each unit of the current team will do for this turn
    teams[currentTeam].forEach((unit) => unit.doBrain())
    // Pass turn to next team
    purgeBlankCells()
    currentTeam = getOtherTeamNum(currentTeam)
    changeCardColors()
    emptyTrashPile()
    updateDebugTray()
    if (currentTeam == 1) fillBlankCells(mapSizeX)
    else fillBlankCells(1)

    if (AutoSpawningRed && getTeamName(currentTeam) == "Red" || AutoSpawningBlue && getTeamName(currentTeam) == "Blue") { // Set via StartAuto
        let cell = blankCells[Math.floor(Math.random() * blankCells.length)]
        if (cell) {
            let unitType = getRandomUnitType()
            spawnGuyAtCell(cell, unitType)
        }
        purgeBlankCells()
    }
}

// Spawn a new unit 
function spawnGuy(team, x, y, unitType) {
    unitType = unitType || getSelectedUnitType()
    let unit = new unitType(team)
    if (!place(unit, x, y)) {
        unit.destroy() // If the unit failed to place, remove it.
        return false // End the function with a result of "failure"
    }
    // Do price changes if I ever care enough to add that.
}

const TrashPile = []
// Add a unit to the trash pile.
function addToTrash(unit) {
    if (!TrashPile.includes(unit)) TrashPile.push(unit)
}
// Empty the trash pile, done at the end of every turn.
function emptyTrashPile() {
    while (TrashPile.length > 0) {
        TrashPile.pop().destroy() // Pop a unit off the trash pile, and destroy it.
    }
}

// Place a unit at a position.
function place(unit, x, y) {
    // If a new value is not provided for the y of the position, it defaults to where the unit currently is. Most units wont be moving in the y direction.
    const oldX = unit.x
    const oldY = unit.y
    const newX = x
    const newY = y || unit.y
    if (isUnitAt(newX, newY)) return false; // Don't move to that spot if there's already a unit there.
    unit.x = newX
    unit.y = newY
    unit.elem.style.gridColumnStart = x
    unit.elem.style.gridRowStart = y
    return true; // Succesfully placed unit
}

// Get the unit type currently selected by the client.
function getSelectedUnitType() {
    let unitTypeString = document.querySelector('input[name="unitType"]:checked').value // black magic
    return unitClasses[unitTypeString]
}

const randomList = ["Normal", "Immolator", "Thorn", "Shield", "Regen"]
// Get a random unit type
function getRandomUnitType() {
    let chosenTypeNum = Math.floor(Math.random() * randomList.length)
    return unitClasses[randomList[chosenTypeNum]]
}

// Sets random units to spawn every turn.
function StartAuto(teamNum) {
    if (getTeamName(teamNum) == "Red") { AutoSpawningRed = !AutoSpawningRed; swapThatColor(redButton, AutoSpawningRed); }
    else if (getTeamName(teamNum) == "Blue") { AutoSpawningBlue = !AutoSpawningBlue; swapThatColor(blueButton, AutoSpawningBlue); }
}

// For use of the StartAuto function
function swapThatColor(element, mode) {
    element.className = mode ? "clicked": ""
}

// Restart the automatic turn interval based on the client's settings.
function recalcInterval(stop) {
    clearInterval(autoInterval)
    turnSpeed = slider.value * 200 || 200
    if (!stop) {
        autoInterval = setInterval(onTurn, slider.value * 200) // <------------------------------ The use of the javascript Browser Object Model to open a browser window or use alert, a timer, or cookies
        if (slider.value == 0) { clearInterval(autoInterval) } // Prevent death by eternal loop 
        gameSpeed.innerHTML = (Math.floor(slider.value * 200)).toString() + "ms"
    } else {
        gameSpeed.innerHTML = "MANUAL"
    }
}

// Triggers a spawn at a specific cell, removing it afterwards.
function spawnGuyAtCell(cell, unitType) {
    let y = Number(cell.style.gridRowStart)
    let x = Number(cell.style.gridColumnStart)
    spawnGuy(currentTeam, x, y, unitType)
    removeBlankCell(cell)
    purgeBlankCells()
}

// Adds a blank spawn cell.
function addBlankCell(x, y) {
    let blankCell = emptyCell.cloneNode(false)
    blankCell.removeAttribute("id")
    if (isUnitAt(x, y)) { return }
    blankCell.style.gridColumnStart = x
    blankCell.style.gridRowStart = y
    blankCell.hidden = false
    blankCell.addEventListener("click", () => { spawnGuyAtCell(blankCell) })
    blankCells.push(blankCell)
    field.appendChild(blankCell)
}

// Removes a blank spawn cell.
function removeBlankCell(cell) {
    blankCells.splice(blankCells.indexOf(cell), 1)
    cell.remove()
}

// Fills a column with blank cells, such as at either spawn.
function fillBlankCells(x) {
    for (let y = 1; y < mapSizeY + 1; y++) {
        addBlankCell(x, y)
    }
}

// Removes EVERY blank cell.
function purgeBlankCells() {
    blankCells.forEach((cell) => { cell.remove() })
    blankCells = []
}

// Changes the colors of the unit selection cards.
function changeCardColors() {
    let cards = document.getElementById("unit-cards")
    if (currentTeam == 1) {
        for (const card of cards.children) {
            card.lastElementChild.lastElementChild.style.filter = "hue-rotate(00deg)"
        }
    } else {
        for (const card of cards.children) {
            card.lastElementChild.lastElementChild.style.filter = "hue-rotate(240deg)"
        }
    }
}

// Updates the information for the debug tray.
function updateDebugTray() {
    debugTray.lastElementChild.innerHTML = `Unit Array = {${units}}<br>Blue Team Array = {${teams[0]}}<br>Red Team Array = {${teams[1]}}`
}

// Runs when the game start button is pressed.
let isGameStarted = false
function onStart() {
    if (isGameStarted) return
    isGameStarted = true

    // Change visuals
    main.hidden = false
    form.hidden = true

    // Create map
    mapSizeX = Number(document.getElementById("map-x").value)
    mapSizeY = Number(document.getElementById("map-y").value)
    field.style.gridTemplateColumns = "repeat(" + mapSizeX + ",1fr)"
    field.style.gridTemplateRows = "repeat(" + mapSizeY + ",8rem)"

    // Set game for first player
    changeCardColors()
    if (currentTeam == 1) fillBlankCells(mapSizeX)
    else fillBlankCells(1)
}

// These functions display the selected map size Y and X on the form page.
function updateY() {
    labelMapY.innerHTML = "Map Height " + sliderMapY.value
}
function updateX() {
    labelMapX.innerHTML = "Map Width " + sliderMapX.value
}

// When the page is loaded
function onLoad() {
    main.hidden = true
    form.hidden = false // <------------ An HTML form to gather information about users or for any other purpose
    updateX()
    updateY()

    //Bounce square
    const square = document.getElementById("bouncy-square")
    animate(square, { // <---------------- The use of a javascript library such as Bootstrap or Jquery to provide layout, control elements, or animation
        rotate: { to: '1turn', ease: "inOutBack(2)", duration: 1200 },
        loopDelay: 400,
        loop: true,
    })
}
onLoad()