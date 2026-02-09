import {
  type NftProviders,
  NftPrivateStateId,
} from "../api/common-types";
import { type ContractAddress } from "@midnight-ntwrk/compact-runtime";
import { BehaviorSubject } from "rxjs";
import { type Logger } from "pino";
import { type NftLocalStorageProps } from "./nft-localStorage-class";
import {
  ContractController,
  type ContractControllerInterface,
} from "../api/contractController";

export type NftContractDeployment =
  | InProgressNftDeployment
  | DeployedNftContractState
  | FailedNftDeployment;

export interface InProgressNftDeployment {
  readonly status: "in-progress";
  readonly address?: ContractAddress;
}

export interface DeployedNftContractState {
  readonly status: "deployed";
  readonly api: ContractControllerInterface;
  readonly address: ContractAddress;
}

export interface FailedNftDeployment {
  readonly status: "failed";
  readonly error: Error;
  readonly address?: ContractAddress;
}

export interface NftContractFollow {
  readonly observable: BehaviorSubject<NftContractDeployment>;
  address?: ContractAddress;
}

export interface NftDeployedAPIProvider {
  readonly joinContract: () => NftContractFollow;
  readonly deployContract: () => Promise<NftContractFollow>;
}

export class NftDeployedManager implements NftDeployedAPIProvider {
  constructor(
    private readonly logger: Logger,
    private readonly localState: NftLocalStorageProps,
    private readonly contractAddress: ContractAddress,
    private readonly providers?: NftProviders
  ) {}

  joinContract(): NftContractFollow {
    const deployment = new BehaviorSubject<NftContractDeployment>({
      status: "in-progress",
      address: this.contractAddress,
    });
    const contractFollow = {
      observable: deployment,
      address: this.contractAddress,
    };

    void this.join(deployment, this.contractAddress);

    return contractFollow;
  }

  async deployContract(): Promise<NftContractFollow> {
    const deployment = new BehaviorSubject<NftContractDeployment>({
      status: "in-progress",
    });

    const address = await this.deploy(deployment);

    return { observable: deployment, address };
  }

  private async deploy(
    deployment: BehaviorSubject<NftContractDeployment>
  ): Promise<string | undefined> {
    try {
      if (this.providers) {
        const api = await ContractController.deploy(
          NftPrivateStateId,
          this.providers,
          this.logger
        );
        this.localState.addContract(api.deployedContractAddress);

        deployment.next({
          status: "deployed",
          api,
          address: api.deployedContractAddress,
        });
        return api.deployedContractAddress;
      } else {
        deployment.next({
          status: "failed",
          error: new Error("Providers are not available"),
        });
      }
    } catch (error: unknown) {
      this.logger.error(error);
      deployment.next({
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
    return undefined;
  }

  private async join(
    deployment: BehaviorSubject<NftContractDeployment>,
    contractAddress: ContractAddress
  ): Promise<void> {
    try {
      if (this.providers) {
        const api = await ContractController.join(
          NftPrivateStateId,
          this.providers,
          contractAddress,
          this.logger
        );

        deployment.next({
          status: "deployed",
          api,
          address: api.deployedContractAddress,
        });
      } else {
        deployment.next({
          status: "failed",
          error: new Error("Providers are not available"),
        });
      }
    } catch (error: unknown) {
      this.logger.error(error);
      deployment.next({
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
