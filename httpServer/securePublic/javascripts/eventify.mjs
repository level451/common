// export default function (self) {
//  let em =  new EventEmitter(self)
// self.events = {}
// self.on = em.on
// self.emit = em.emit
// self.once = em.once
// }
// class EventEmitter {
//     on(event, listener) {
//         if (typeof this.events[event] !== 'object') {
//             this.events[event] = [];
//         }
//         this.events[event].push(listener);
//         return () => this.removeListener(event, listener);
//     }
//     removeListener(event, listener) {
//         if (typeof this.events[event] === 'object') {
//             const idx = this.events[event].indexOf(listener);
//             if (idx > -1) {
//                 this.events[event].splice(idx, 1);
//             }
//         }
//     }
//     emit(event, ...args) {
//         if (typeof this.events[event] === 'object') {
//             this.events[event].forEach(listener => listener.apply(this, args));
//         }
//     }
//     once(event, listener) {
//         const remove = this.on(event, (...args) => {
//             remove();
//             listener.apply(this, args);
//         });
//     }
// };
export default function (self) {
    self.events = {};
    self.on = function (event, listener) {
        if (typeof self.events[event] !== 'object') {
            self.events[event] = [];
        }
        self.events[event].push(listener);
    };
    self.removeListener = function (event, listener) {
        let idx;
        if (typeof self.events[event] === 'object') {
            idx = self.events[event].indexOf(listener);
            if (idx > -1) {
                self.events[event].splice(idx, 1);
            }
        }
    };
    self.emit = function (event,args) {
        var i, listeners, length//, args = [].slice.call(arguments, 1);
        if (typeof self.events[event] === 'object') {
            listeners = self.events[event].slice();
            length = listeners.length;
            for (i = 0; i < length; i++) {

                listeners[i].apply(self, args);
            }
        }
    };
    self.once = function (event, listener) {
        self.on(event, function g () {
            self.removeListener(event, g)
            listener.apply(self, arguments)
        })

    };
}