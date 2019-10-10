
# TODO

- make the protocol completely symmetric, and implement the star topology trough the facades
- remove host-client typisation, just ignore self requests
- add option to identify and filter channels, default rules for processing, ability to set custom domain verification handler
- add default method for processing requests, for which there was no subscription, thus giving the possibility of logging errors or automatic response to unknown requests
- add response timeout to the options, with an automatically triggered error of the transport level
- move communication frame from head to body
- send version number in the protocol and automatically detect the lag from other environments when receiving packets
- automatically detect old ie and fallback protocol to stringified
- move js code generation to actionscript
